import {
  DEFAULT_MATCH_THRESHOLD_PERCENT,
  OCR_REGIONS_BY_GAME_KEY,
  type CardSearchEmbeddings,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { ocrRegions } from "../../lib/ocr";
import { recordScanVectorizeSource } from "../../lib/scan-vectorize-stats";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findCardMatches } from "./shared";

function parseEmbeddingField(value: unknown): number[] | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const searchByVectorRoute = new Hono<AppEnv>().post(
  "/by-vector",
  requireAuth,
  requireOrg,
  async (c) => {
    const body = await c.req.parseBody();
    const file = body["image"];
    const collectionGuid =
      typeof body["collectionGuid"] === "string"
        ? body["collectionGuid"]
        : undefined;
    const ocrEnabled = body["ocrEnabled"] !== "false";

    if (!file || typeof file === "string") {
      return c.json({ success: false, message: "No image provided." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return c.json(
        { success: false, message: "Uploaded file is not an image." },
        400,
      );
    }

    const embedding = parseEmbeddingField(body["embedding"]);
    if (!embedding) {
      return c.json({ success: false, message: "No embedding provided." }, 400);
    }
    const embeddings: CardSearchEmbeddings = { embedding };
    void recordScanVectorizeSource("web");

    const resolved = await resolveGameKeyAndLang(
      c.get("jwtClaims"),
      collectionGuid,
    );
    if (!resolved) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }
    const { gameKey, lang, matchThreshold } = resolved;
    const minConfidence =
      (matchThreshold ?? DEFAULT_MATCH_THRESHOLD_PERCENT) / 100;

    const buffer = Buffer.from(await file.arrayBuffer());
    let ocrText = "";
    if (ocrEnabled) {
      try {
        ocrText = await ocrRegions(buffer, OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []);
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const result = await findCardMatches(c.get("jwtClaims"), {
        gameKey,
        lang,
        minConfidence,
        embeddings,
        ocrText,
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      const orgId = c.req.header("X-Org-Id");
      if (orgId) {
        void sendDiscordNotification(
          orgId,
          {
            title: "Magic Vault — Card Search Error",
            description:
              "A database error occurred while searching for a card.",
            color: 0xed4245,
            timestamp: new Date().toISOString(),
          },
          "error",
        );
      }
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
