import { DISTANCE_THRESHOLD, OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { Hono } from "hono";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { ocrRegions } from "../../lib/ocr";
import { recordScanVectorizeSource } from "../../lib/scan-vectorize-stats";
import { vectorizeCardImage } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findCardMatches } from "./shared";

export const searchByImageRoute = new Hono<AppEnv>().post(
  "/",
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
    const distanceThreshold =
      matchThreshold != null ? 1 - matchThreshold / 100 : DISTANCE_THRESHOLD;

    const buffer = Buffer.from(await file.arrayBuffer());

    let embeddings: Awaited<ReturnType<typeof vectorizeCardImage>>;
    let ocrText: string;
    try {
      const [embeddingResult, ocrResult] = await Promise.all([
        vectorizeCardImage(buffer),
        ocrEnabled
          ? ocrRegions(buffer, OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []).catch(
              () => "",
            )
          : Promise.resolve(""),
      ]);
      embeddings = embeddingResult;
      ocrText = ocrResult;
      void recordScanVectorizeSource("server");
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Failed to vectorize image." },
        500,
      );
    }

    try {
      const result = await findCardMatches(c.get("jwtClaims"), {
        gameKey,
        lang,
        distanceThreshold,
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
