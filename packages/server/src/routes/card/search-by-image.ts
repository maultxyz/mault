import type { SearchCardMatch } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { vectorizeImageFromBuffer } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

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

    let embedding: number[];
    try {
      embedding = await vectorizeImageFromBuffer(
        Buffer.from(await file.arrayBuffer()),
      );
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Failed to vectorize image." },
        500,
      );
    }

    const embeddingStr = `[${embedding.join(",")}]`;
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
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
        await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 100000`);

        const matches = await tx.execute(sql`
          SELECT
            card_id,
            embedding <=> ${embeddingStr}::vector(768) AS distance
          FROM cards
          WHERE game_key = ${gameKey} AND lang = ${lang} AND (embedding <=> ${embeddingStr}::vector(768)) < 0.3
          ORDER BY embedding <=> ${embeddingStr}::vector(768)
          LIMIT 5
        `);

        const matchList: SearchCardMatch[] = matches.rows.map((row) => ({
          id: row.card_id as string,
          cardId: row.card_id as string,
          distance: row.distance as number,
        }));

        return {
          message: "Successfully searched for card.",
          success: true,
          data: matchList.length > 0 ? matchList : null,
        };
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
            description: "A database error occurred while searching for a card.",
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
