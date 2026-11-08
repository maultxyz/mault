import { Hono } from "hono";
import {
  findBestMatchAcrossGames,
  matchScopesForGames,
  parseMatchGameKeys,
  tagWithGame,
} from "../../lib/card-search/match-games";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { vectorizeCardImage } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatches,
  parsePreferredSetCodes,
} from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

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
    const scopes = matchScopesForGames(
      resolved,
      parseMatchGameKeys(body["matchGameKeys"]),
    );
    const preferredSetCodes = parsePreferredSetCodes(body);

    const buffer = Buffer.from(await file.arrayBuffer());

    let embeddings: Awaited<ReturnType<typeof vectorizeCardImage>>;
    try {
      embeddings = await vectorizeCardImage(buffer);
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Failed to vectorize image." },
        500,
      );
    }

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
      const withEmbedding = result.diagnostics
        ? {
            ...result,
            diagnostics: {
              ...result.diagnostics,
              embedding: embeddings.embedding,
            },
          }
        : result;
      const attached = await attachMatchedCards(
        withEmbedding,
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
