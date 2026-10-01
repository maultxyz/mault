import type { CardSearchEmbeddings } from "@magic-vault/shared";
import { Hono } from "hono";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatches,
  parseEmbeddingField,
  parsePreferredSetCode,
} from "./shared";

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
    const { gameKey, lang } = resolved;

    try {
      const result = await findCardMatches(c.get("jwtClaims"), {
        gameKey,
        lang,
        embeddings,
        preferredSetCode: parsePreferredSetCode(body["preferredSetCode"]),
      });
      return c.json(await attachMatchedCards(result, gameKey, lang));
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
