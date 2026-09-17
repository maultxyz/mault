import {
  CARD_MATCH_RERANK_WEIGHTS,
  type CardSearchEmbeddings,
  type SearchCardMatch,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";

const RERANK_SHORTLIST_SIZE = 25;

export function normalizeForMatch(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractOcrTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .map(normalizeForMatch)
    .filter((token) => token.length > 0);
}

function vectorLiteral(embedding: number[] | null): string | null {
  return embedding ? `[${embedding.join(",")}]` : null;
}

export interface CardMatchSearchResult {
  message: string;
  success: true;
  data: SearchCardMatch[] | null;
}

export async function findCardMatches(
  jwtClaims: string,
  {
    gameKey,
    lang,
    distanceThreshold,
    embeddings,
    ocrText,
  }: {
    gameKey: string;
    lang: string;
    distanceThreshold: number;
    embeddings: CardSearchEmbeddings;
    ocrText: string;
  },
): Promise<CardMatchSearchResult> {
  const embeddingStr = vectorLiteral(embeddings.embedding)!;
  const artStr = vectorLiteral(embeddings.embeddingArt);
  const nameStr = vectorLiteral(embeddings.embeddingName);
  const bottomStr = vectorLiteral(embeddings.embeddingBottom);
  const ocrTokens = extractOcrTokens(ocrText);
  const isLocal = process.env.NODE_ENV !== "production";

  if (isLocal) {
    console.log(
      `[card-search] query-side vectors for game=${gameKey}: full=yes art=${artStr ? "yes" : "no"} name=${nameStr ? "yes" : "no"} bottom=${bottomStr ? "yes" : "no"}`,
    );
  }

  return authQuery(jwtClaims, async (tx) => {
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

    if (isLocal) {
      console.log(`[card-search] shortlist matches for game=${gameKey} lang=${lang}:`);
      console.table(
        rows.map(
          ({
            cardId,
            setCode,
            distance,
            distArt,
            distName,
            distBottom,
            rerankScore,
          }) => ({
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
          }),
        ),
      );
    }

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

    const matchList: SearchCardMatch[] = ranked.map(({ id, cardId, distance }) => ({
      id,
      cardId,
      distance,
    }));

    return {
      message: "Successfully searched for card.",
      success: true,
      data: matchList.length > 0 ? matchList : null,
    };
  });
}
