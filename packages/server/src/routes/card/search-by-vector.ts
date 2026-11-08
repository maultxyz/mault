import type { CardSearchEmbeddings } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  findBestMatchAcrossGames,
  matchScopesForGames,
  parseMatchGameKeys,
  tagWithGame,
} from "../../lib/card-search/match-games";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatches,
  parseEmbeddingField,
  parsePreferredSetCodes,
} from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const searchByVectorRoute = new Hono<AppEnv>().post(
  "/by-vector",
  requireAuth,
  requireOrg,
  async (c) => {
    const body = await c.req.parseBody();
    const collectionGuid =
      typeof body["collectionGuid"] === "string"
        ? body["collectionGuid"]
        : undefined;

    const embedding = parseEmbeddingField(body["embedding"]);
    if (!embedding) {
      return c.json({ success: false, message: "No embedding provided." }, 400);
    }
    const embeddings: CardSearchEmbeddings = { embedding };

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
    const scopes = matchScopesForGames(
      resolved,
      parseMatchGameKeys(body["matchGameKeys"]),
    );
    const preferredSetCodes = parsePreferredSetCodes(body);

    try {
      const { result, scope } = await findBestMatchAcrossGames(
        scopes,
        (matchScope) =>
          findCardMatches({
            ...matchScope,
            embeddings,
            preferredSetCodes,
            skipsUnloadedIndex: matchScope.gameKey !== resolved.gameKey,
          }),
      );
      const attached = await attachMatchedCards(
        result,
        scope.gameKey,
        scope.lang,
      );
      return c.json(
        scopes.length > 1 ? tagWithGame(attached, scope.gameKey) : attached,
      );
    } catch (err) {
      const orgId = c.req.header("X-Org-Id");
      if (orgId) {
        void sendDiscordNotification(
          orgId,
          {
            title: "Mault: Card Search Error",
            description:
              "A database error occurred while searching for a card.",
            color: 0xed4245,
            timestamp: new Date().toISOString(),
          },
          "error",
        );
      }
      return databaseErrorResponse(c, err);
    }
  },
);
