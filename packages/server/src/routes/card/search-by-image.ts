import {
  DISTANCE_THRESHOLD,
  OCR_REGIONS_BY_GAME_KEY,
  type SearchCardMatch,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { sendDiscordNotification } from "../../lib/discord";
import { ocrRegions } from "../../lib/ocr";
import { vectorizeImageFromBuffer } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

function normalizeForMatch(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function extractOcrTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .map(normalizeForMatch)
    .filter((token) => token.length > 0);
}

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
    const { gameKey, lang } = resolved;

    const buffer = Buffer.from(await file.arrayBuffer());

    let embedding: number[];
    let ocrText: string;
    try {
      const [embeddingResult, ocrResult] = await Promise.all([
        vectorizeImageFromBuffer(buffer),
        ocrEnabled
          ? ocrRegions(buffer, OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []).catch(
              () => "",
            )
          : Promise.resolve(""),
      ]);
      embedding = embeddingResult;
      ocrText = ocrResult;
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Failed to vectorize image." },
        500,
      );
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    const ocrTokens = extractOcrTokens(ocrText);

    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
        await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 100000`);

        const matches = await tx.execute(sql`
          SELECT
            card_id,
            set_code,
            embedding <=> ${embeddingStr}::vector(768) AS distance
          FROM cards
          WHERE game_key = ${gameKey} AND lang = ${lang} AND (embedding <=> ${embeddingStr}::vector(768)) < ${DISTANCE_THRESHOLD}
          ORDER BY embedding <=> ${embeddingStr}::vector(768)
          LIMIT 5
        `);

        const rows = matches.rows.map((row) => ({
          id: row.card_id as string,
          cardId: row.card_id as string,
          setCode: row.set_code as string,
          distance: row.distance as number,
        }));

        const ranked =
          ocrTokens.length > 0
            ? [...rows].sort((a, b) => {
                const aCode = normalizeForMatch(a.setCode);
                const bCode = normalizeForMatch(b.setCode);
                const aMatch =
                  aCode.length >= 2 &&
                  ocrTokens.some((token) => token.includes(aCode));
                const bMatch =
                  bCode.length >= 2 &&
                  ocrTokens.some((token) => token.includes(bCode));
                return Number(bMatch) - Number(aMatch);
              })
            : rows;

        const matchList: SearchCardMatch[] = ranked.map(
          ({ id, cardId, distance }) => ({ id, cardId, distance }),
        );

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
