import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import {
  findBestMatchAcrossGames,
  matchScopesForGames,
  parseMatchGameKeys,
  tagWithGame,
} from "../../lib/card-search/match-games";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { MILO_EMBEDDING_DIM } from "../../lib/constants/card-search";
import { scanLog } from "../../lib/scan-log";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatches,
  findCardMatchesByOcr,
  parsePreferredSetCodes,
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

    const collectionScope = await resolveGameKeyAndLang(
      c.get("jwtClaims"),
      collectionGuid,
    );
    if (!collectionScope) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }
    const matchGameKeys = parseMatchGameKeys(body["matchGameKeys"]);
    const scopes = matchScopesForGames(collectionScope, matchGameKeys);
    const resolved =
      scopes.length > 1
        ? (
            await findBestMatchAcrossGames(scopes, (matchScope) =>
              findCardMatches({
                ...matchScope,
                embeddings: { embedding },
                skipsUnloadedIndex:
                  matchScope.gameKey !== collectionScope.gameKey,
              }),
            )
          ).scope
        : collectionScope;
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
      const result = await findCardMatchesByOcr(
        Buffer.from(await file.arrayBuffer()),
        regions,
        {
          ...resolved,
          embeddings: { embedding },
          preferredSetCodes: parsePreferredSetCodes(body),
        },
      );
      const { readout } = result.ocr;
      scanLog(
        `[ocr] game=${gameKey} lang=${lang} name=${JSON.stringify(readout.name)} setLine=${JSON.stringify(readout.setLine)} number=${JSON.stringify(readout.number)} language=${JSON.stringify(readout.language)}${result.ocr.scopedToPrintedLanguage ? ` scopedTo=${result.ocr.scopedToPrintedLanguage}` : ""} closestName=${result.ocr.matchedName ? `${JSON.stringify(result.ocr.matchedName)} (${(result.ocr.nameScore ?? 0).toFixed(2)})` : "none"} ${result.ocr.usedFallback ? " fallback" : ""} printedPromo=${result.ocr.printedPromo ?? "unread"} printingMarks=${result.printingMarks?.cardId ? `${result.printingMarks.cardId} over ${result.printingMarks.replacedCardId} by ${result.printingMarks.evidence.toFixed(2)}${result.printingMarks.confirmed ? " confirmed" : ""}` : (result.printingMarks?.skipped ?? "no decision")} -> ${result.data ? `matched ${result.data[0].cardId} at ${result.data[0].distance.toFixed(3)}` : "no match"}`,
      );
      const attached = await attachMatchedCards(result, gameKey, lang);
      return c.json(scopes.length > 1 ? tagWithGame(attached, gameKey) : attached);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Text search failed." }, 500);
    }
  },
);
