import type {
  CardSearchEmbeddings,
  SearchCardMatch,
} from "@magic-vault/shared";
import { DISTANCE_THRESHOLD } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";
import { MATCH_CONFIDENCE_TEMPERATURE } from "../../lib/constants/card-search";

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

// Each candidate's softmax share among all nearest candidates, taken before
// the threshold filter so a runner-up just past the threshold still counts
// against the winner. Raw similarity alone reads low for a correct match,
// since a camera frame never embeds identically to a clean reference image;
// the margin over the next-best card is what actually decides the match.
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
    // Default is 40, which under-searches once the game/lang filter forces
    // iterative_scan to keep expanding — widening the base beam here cuts
    // down how often iterative_scan has to fall back on extra rounds.
    await tx.execute(sql`SET LOCAL hnsw.ef_search = 200`);

    const matches = await tx.execute(sql`
      SELECT
        card_id,
        set_code,
        embedding <=> ${embeddingStr}::vector(128) AS distance
      FROM cards
      WHERE game_key = ${gameKey} AND lang = ${lang}
      ORDER BY embedding <=> ${embeddingStr}::vector(128)
      LIMIT ${MATCH_LIMIT}
    `);

    const candidates = withConfidence(
      matches.rows.map((row) => ({
        id: row.card_id as string,
        cardId: row.card_id as string,
        setCode: row.set_code as string,
        distance: row.distance as number,
      })),
    );

    if (showVectorLogs) {
      console.log(
        `[card-search] nearest candidates for game=${gameKey} lang=${lang} (minConfidence=${minConfidence}, maxDistance=${DISTANCE_THRESHOLD}):`,
      );
      console.table(candidates);
    }

    // Confidence is relative to the other candidates, so a frame showing no
    // card, or one from another game, can still have a clear leader. The
    // fixed distance cap is the absolute floor that rejects those, and the
    // collection's setting gates on the leader's confidence alone so a close
    // runner-up still survives as an alternative to pick from.
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
