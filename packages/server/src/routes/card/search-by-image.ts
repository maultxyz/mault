import { Hono } from "hono";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { vectorizeCardImage } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  attachMatchedCards,
  findCardMatches,
  parsePreferredSetCode,
} from "./shared";

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
    const { gameKey, lang } = resolved;

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
      const result = await findCardMatches(c.get("jwtClaims"), {
        gameKey,
        lang,
        embeddings,
        preferredSetCode: parsePreferredSetCode(body["preferredSetCode"]),
      });
      const withEmbedding = result.diagnostics
        ? {
            ...result,
            diagnostics: {
              ...result.diagnostics,
              embedding: embeddings.embedding,
            },
          }
        : result;
      return c.json(await attachMatchedCards(withEmbedding, gameKey, lang));
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
