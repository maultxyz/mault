import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { MILO_EMBEDDING_DIM } from "../../lib/constants/card-search";
import { ocrRegions } from "../../lib/ocr";
import { scanLog } from "../../lib/scan-log";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatchesByText,
  parsePreferredSetCode,
  parseEmbeddingField,
} from "./shared";

export const searchByTextRoute = new Hono<AppEnv>().post(
  "/by-text",
  requireAuth,
  requireOrg,
  async (c) => {
    const body = await c.req.parseBody();
    const file = body["image"];
    const collectionGuid =
      typeof body["collectionGuid"] === "string"
        ? body["collectionGuid"]
        : undefined;

    if (!file || typeof file === "string" || !file.type.startsWith("image/")) {
      return c.json({ success: false, message: "No image provided." }, 400);
    }

    const embedding = parseEmbeddingField(body["embedding"]);
    if (!embedding || embedding.length !== MILO_EMBEDDING_DIM) {
      return c.json({ success: false, message: "No embedding provided." }, 400);
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
    const { gameKey, lang } = resolved;

    const settings = await authQuery(c.get("jwtClaims"), (tx) =>
      tx.query.orgSettings.findFirst({
        where: eq(orgSettings.orgId, c.get("orgId")),
        columns: { ocrEnabled: true },
      }),
    );
    if (!settings?.ocrEnabled) {
      return c.json(
        { success: false, message: "OCR is turned off for this organization." },
        400,
      );
    }

    const regions = OCR_REGIONS_BY_GAME_KEY[gameKey] ?? [];
    if (regions.length === 0) {
      return c.json(
        { success: false, message: "OCR is not supported for this game." },
        400,
      );
    }

    try {
      const readout = await ocrRegions(
        Buffer.from(await file.arrayBuffer()),
        regions,
      );
      const result = await findCardMatchesByText(c.get("jwtClaims"), {
        gameKey,
        lang,
        embeddings: { embedding },
        readout,
        preferredSetCode: parsePreferredSetCode(body["preferredSetCode"]),
      });
      scanLog(
        `[ocr] game=${gameKey} lang=${lang} name=${JSON.stringify(readout.name)} setLine=${JSON.stringify(readout.setLine)} closestName=${result.ocr.matchedName ? `${JSON.stringify(result.ocr.matchedName)} (${(result.ocr.nameScore ?? 0).toFixed(2)})` : "none"} -> ${result.data ? `matched ${result.data[0].cardId} at ${result.data[0].distance.toFixed(3)}` : "no match"}`,
      );
      return c.json(await attachMatchedCards(result, gameKey, lang));
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Text search failed." }, 500);
    }
  },
);
