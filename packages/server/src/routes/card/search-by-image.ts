import {
  CARD_CROP_REGIONS_BY_GAME_KEY,
  CARD_MATCH_RERANK_WEIGHTS,
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
import { vectorizeCardImage } from "../../lib/vectorize";
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

const RERANK_SHORTLIST_SIZE = 25;

function vectorLiteral(embedding: number[] | null): string | null {
  return embedding ? `[${embedding.join(",")}]` : null;
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
    const { gameKey, lang, matchThreshold } = resolved;
    const distanceThreshold =
      matchThreshold != null ? 1 - matchThreshold / 100 : DISTANCE_THRESHOLD;

    const buffer = Buffer.from(await file.arrayBuffer());
    const cropRegions = CARD_CROP_REGIONS_BY_GAME_KEY[gameKey];

    let cardEmbeddings: Awaited<ReturnType<typeof vectorizeCardImage>>;
    let ocrText: string;
    try {
      const [embeddingResult, ocrResult] = await Promise.all([
        vectorizeCardImage(buffer, cropRegions),
        ocrEnabled
          ? ocrRegions(buffer, OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []).catch(
              () => "",
            )
          : Promise.resolve(""),
      ]);
      cardEmbeddings = embeddingResult;
      ocrText = ocrResult;
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Failed to vectorize image." },
        500,
      );
    }

    const embeddingStr = vectorLiteral(cardEmbeddings.embedding)!;
    const artStr = vectorLiteral(cardEmbeddings.embeddingArt);
    const nameStr = vectorLiteral(cardEmbeddings.embeddingName);
    const bottomStr = vectorLiteral(cardEmbeddings.embeddingBottom);
    const ocrTokens = extractOcrTokens(ocrText);

    console.log(
      `[search-by-image] query-side vectors for game=${gameKey}: cropRegions=${cropRegions ? Object.keys(cropRegions).join(",") || "none" : "none (no crop regions configured for this game)"} | full=yes art=${artStr ? "yes" : "no"} name=${nameStr ? "yes" : "no"} bottom=${bottomStr ? "yes" : "no"}`,
    );

    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
        await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 100000`);

        const matches = await tx.execute(sql`
          WITH shortlist AS (
            SELECT
              card_id,
              set_code,
              embedding_art,
              embedding_name,
              embedding_bottom,
              embedding <=> ${embeddingStr}::vector(768) AS dist_full
            FROM cards
            WHERE game_key = ${gameKey} AND lang = ${lang} AND (embedding <=> ${embeddingStr}::vector(768)) < ${distanceThreshold}
            ORDER BY embedding <=> ${embeddingStr}::vector(768)
            LIMIT ${RERANK_SHORTLIST_SIZE}
          )
          SELECT
            card_id,
            set_code,
            dist_full AS distance,
            CASE WHEN embedding_art IS NOT NULL AND ${artStr}::vector(768) IS NOT NULL
                 THEN embedding_art <=> ${artStr}::vector(768) ELSE NULL END AS dist_art,
            CASE WHEN embedding_name IS NOT NULL AND ${nameStr}::vector(768) IS NOT NULL
                 THEN embedding_name <=> ${nameStr}::vector(768) ELSE NULL END AS dist_name,
            CASE WHEN embedding_bottom IS NOT NULL AND ${bottomStr}::vector(768) IS NOT NULL
                 THEN embedding_bottom <=> ${bottomStr}::vector(768) ELSE NULL END AS dist_bottom,
            (
              ${CARD_MATCH_RERANK_WEIGHTS.full}::float8 * dist_full
              + CASE WHEN embedding_art IS NOT NULL AND ${artStr}::vector(768) IS NOT NULL
                     THEN ${CARD_MATCH_RERANK_WEIGHTS.art}::float8 * (embedding_art <=> ${artStr}::vector(768)) ELSE 0 END
              + CASE WHEN embedding_name IS NOT NULL AND ${nameStr}::vector(768) IS NOT NULL
                     THEN ${CARD_MATCH_RERANK_WEIGHTS.name}::float8 * (embedding_name <=> ${nameStr}::vector(768)) ELSE 0 END
              + CASE WHEN embedding_bottom IS NOT NULL AND ${bottomStr}::vector(768) IS NOT NULL
                     THEN ${CARD_MATCH_RERANK_WEIGHTS.bottom}::float8 * (embedding_bottom <=> ${bottomStr}::vector(768)) ELSE 0 END
            ) / (
              ${CARD_MATCH_RERANK_WEIGHTS.full}::float8
              + CASE WHEN embedding_art IS NOT NULL AND ${artStr}::vector(768) IS NOT NULL THEN ${CARD_MATCH_RERANK_WEIGHTS.art}::float8 ELSE 0 END
              + CASE WHEN embedding_name IS NOT NULL AND ${nameStr}::vector(768) IS NOT NULL THEN ${CARD_MATCH_RERANK_WEIGHTS.name}::float8 ELSE 0 END
              + CASE WHEN embedding_bottom IS NOT NULL AND ${bottomStr}::vector(768) IS NOT NULL THEN ${CARD_MATCH_RERANK_WEIGHTS.bottom}::float8 ELSE 0 END
            ) AS rerank_score
          FROM shortlist
          ORDER BY rerank_score
          LIMIT 5
        `);

        const rows = matches.rows.map((row) => ({
          id: row.card_id as string,
          cardId: row.card_id as string,
          setCode: row.set_code as string,
          distance: row.distance as number,
          distArt: row.dist_art as number | null,
          distName: row.dist_name as number | null,
          distBottom: row.dist_bottom as number | null,
          rerankScore: row.rerank_score as number,
        }));

        console.log(
          `[search-by-image] shortlist matches for game=${gameKey} lang=${lang}:`,
        );
        console.table(
          rows.map(({ cardId, setCode, distance, distArt, distName, distBottom, rerankScore }) => ({
            cardId,
            setCode,
            distFull: distance,
            distArt,
            distName,
            distBottom,
            rerankScore,
            vectorsUsed:
              1 +
              (distArt != null ? 1 : 0) +
              (distName != null ? 1 : 0) +
              (distBottom != null ? 1 : 0),
          })),
        );

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
