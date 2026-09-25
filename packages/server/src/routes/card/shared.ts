import type {
  CardSearchEmbeddings,
  SearchCardMatch,
} from "@magic-vault/shared";
import { DISTANCE_THRESHOLD } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";
import {
  DUPLICATE_PRINTING_MAX_DISTANCE,
  MATCH_CONFIDENCE_TEMPERATURE,
} from "../../lib/constants/card-search";

const MATCH_LIMIT = 5;

export function normalizeForMatch(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractOcrTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .map(normalizeForMatch)
    .filter((token) => token.length > 0);
}

function withConfidence<T extends { distance: number }>(
  candidates: T[],
): (T & { confidence: number })[] {
  return candidates.map((c) => {
    const total = candidates.reduce(
      (sum, other) =>
        sum +
        Math.exp((c.distance - other.distance) / MATCH_CONFIDENCE_TEMPERATURE),
      0,
    );
    return { ...c, confidence: 1 / total };
  });
}

function poolDuplicatePrintings<
  T extends { confidence: number; leaderDistance: number },
>(candidates: T[]): T[] {
  const isDuplicate = (c: T) =>
    c.leaderDistance <= DUPLICATE_PRINTING_MAX_DISTANCE;
  const pooled = candidates
    .filter(isDuplicate)
    .reduce((sum, c) => sum + c.confidence, 0);
  return candidates.map((c) =>
    isDuplicate(c) ? { ...c, confidence: pooled } : c,
  );
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
    minConfidence,
    embeddings,
    ocrText,
  }: {
    gameKey: string;
    lang: string;
    minConfidence: number;
    embeddings: CardSearchEmbeddings;
    ocrText: string;
  },
): Promise<CardMatchSearchResult> {
  const embeddingStr = vectorLiteral(embeddings.embedding)!;
  const ocrTokens = extractOcrTokens(ocrText);
  const showVectorLogs = process.env.SHOW_VECTOR_LOGS == "true";

  return authQuery(jwtClaims, async (tx) => {
    await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
    await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 100000`);
    await tx.execute(sql`SET LOCAL hnsw.ef_search = 200`);

    const matches = await tx.execute(sql`
      WITH nearest AS (
        SELECT
          card_id,
          set_code,
          embedding,
          embedding <=> ${embeddingStr}::vector(128) AS distance
        FROM cards
        WHERE game_key = ${gameKey} AND lang = ${lang}
        ORDER BY embedding <=> ${embeddingStr}::vector(128)
        LIMIT ${MATCH_LIMIT}
      )
      SELECT
        card_id,
        set_code,
        distance,
        embedding <=> first_value(embedding) OVER (ORDER BY distance) AS leader_distance
      FROM nearest
      ORDER BY distance
    `);

    const candidates = poolDuplicatePrintings(
      withConfidence(
        matches.rows.map((row) => ({
          id: row.card_id as string,
          cardId: row.card_id as string,
          setCode: row.set_code as string,
          distance: row.distance as number,
          leaderDistance: row.leader_distance as number,
        })),
      ),
    );

    if (showVectorLogs) {
      console.log(
        `[card-search] nearest candidates for game=${gameKey} lang=${lang} (minConfidence=${minConfidence}, maxDistance=${DISTANCE_THRESHOLD}):`,
      );
      console.table(candidates);
    }

    const rows = candidates.filter((c) => c.distance < DISTANCE_THRESHOLD);
    if ((rows[0]?.confidence ?? 0) < minConfidence) {
      return {
        message: "Successfully searched for card.",
        success: true,
        data: null,
      };
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

    const matchList: SearchCardMatch[] = ranked.map(
      ({ id, cardId, distance, confidence }) => ({
        id,
        cardId,
        distance,
        confidence,
      }),
    );

    return {
      message: "Successfully searched for card.",
      success: true,
      data: matchList.length > 0 ? matchList : null,
    };
  });
}
