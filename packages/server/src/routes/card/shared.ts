import type { CardSearchEmbeddings, SearchCardMatch } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";

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
  const ocrTokens = extractOcrTokens(ocrText);
  const isLocal = process.env.NODE_ENV !== "production";

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

    const candidates = matches.rows.map((row) => ({
      id: row.card_id as string,
      cardId: row.card_id as string,
      setCode: row.set_code as string,
      distance: row.distance as number,
    }));

    if (isLocal) {
      console.log(
        `[card-search] nearest candidates for game=${gameKey} lang=${lang} (threshold=${distanceThreshold}):`,
      );
      console.table(candidates);
    }

    const rows = candidates.filter((c) => c.distance < distanceThreshold);

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
