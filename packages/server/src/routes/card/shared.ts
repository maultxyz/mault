import type {
  CardSearchDiagnostics,
  CardSearchEmbeddings,
  OcrDiagnostics,
  OcrReadout,
  SearchCardMatch,
  SearchNoMatchReason,
} from "@magic-vault/shared";
import { CLOSE_MATCH_DELTA, DISTANCE_THRESHOLD } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";
import { resolveCardSearchForGame } from "../../lib/card-search/resolve";
import { searchCardById } from "../../lib/card-search/stored-cards";
import {
  DUPLICATE_PRINTING_MAX_DISTANCE,
  MATCH_CONFIDENCE_TEMPERATURE,
  MATCH_MAX_DISTANCE_RATIO,
} from "../../lib/constants/card-search";
import {
  OCR_MAX_NAME_LINES,
  OCR_NAME_CANDIDATE_LIMIT,
  OCR_NAME_MIN_LENGTH,
  OCR_NAME_MIN_SIMILARITY,
} from "../../lib/constants/ocr";

const MATCH_LIMIT = 5;
const RUNNER_UP_SEARCH_LIMIT = 20;

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

export function parseEmbeddingField(value: unknown): number[] | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface CardMatchSearchResult {
  message: string;
  success: true;
  data: SearchCardMatch[] | null;
  nearestDistance: number | null;
  diagnostics?: CardSearchDiagnostics;
}

export async function findCardMatches(
  jwtClaims: string,
  {
    gameKey,
    lang,
    embeddings,
  }: {
    gameKey: string;
    lang: string;
    embeddings: CardSearchEmbeddings;
  },
): Promise<CardMatchSearchResult> {
  const embeddingStr = vectorLiteral(embeddings.embedding)!;
  const showVectorLogs = process.env.SHOW_VECTOR_LOGS == "true";

  return authQuery(jwtClaims, async (tx) => {
    await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
    await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 100000`);
    await tx.execute(sql`SET LOCAL hnsw.ef_search = 200`);

    const matches = await tx.execute(sql`
      WITH nearest AS (
        SELECT
          card_id,
          name,
          set_code,
          embedding,
          embedding <=> ${embeddingStr}::vector(128) AS distance
        FROM cards
        WHERE game_key = ${gameKey} AND lang = ${lang}
        ORDER BY embedding <=> ${embeddingStr}::vector(128)
        LIMIT ${RUNNER_UP_SEARCH_LIMIT}
      )
      SELECT
        card_id,
        name,
        set_code,
        distance,
        embedding <=> first_value(embedding) OVER (ORDER BY distance) AS leader_distance
      FROM nearest
      ORDER BY distance
    `);

    const leaderName = matches.rows[0]?.name as string | undefined;
    const runnerUpDistance =
      (matches.rows.find((row) => row.name !== leaderName)?.distance as
        | number
        | undefined) ?? null;

    const candidates = poolDuplicatePrintings(
      withConfidence(
        matches.rows.slice(0, MATCH_LIMIT).map((row) => ({
          id: row.card_id as string,
          cardId: row.card_id as string,
          name: row.name as string,
          setCode: row.set_code as string,
          distance: row.distance as number,
          leaderDistance: row.leader_distance as number,
        })),
      ),
    );

    if (showVectorLogs) {
      console.log(
        `[card-search] nearest candidates for game=${gameKey} lang=${lang} (maxDistance=${DISTANCE_THRESHOLD}, maxRatio=${MATCH_MAX_DISTANCE_RATIO}, runnerUpDistance=${runnerUpDistance}):`,
      );
      console.table(candidates);
    }

    const nearestDistance = candidates[0]?.distance ?? null;
    const isAmbiguous =
      nearestDistance != null &&
      runnerUpDistance != null &&
      nearestDistance >= runnerUpDistance * MATCH_MAX_DISTANCE_RATIO;
    const rows = isAmbiguous
      ? []
      : candidates.filter((c) => c.distance < DISTANCE_THRESHOLD);
    if (rows.length === 0) {
      const reason: SearchNoMatchReason =
        nearestDistance == null
          ? "empty_index"
          : isAmbiguous
            ? "ambiguous"
            : "too_far";
      return {
        message: "Successfully searched for card.",
        success: true,
        data: null,
        nearestDistance,
        diagnostics: {
          reason,
          gameKey,
          lang,
          nearestDistance,
          runnerUpDistance,
          runnerUpName:
            (matches.rows.find((row) => row.name !== leaderName)?.name as
              | string
              | undefined) ?? null,
          distanceThreshold: DISTANCE_THRESHOLD,
          maxDistanceRatio: MATCH_MAX_DISTANCE_RATIO,
          candidates: candidates.map(({ cardId, name, setCode, distance }) => ({
            cardId,
            name,
            setCode,
            distance,
          })),
        },
      };
    }

    const matchList: SearchCardMatch[] = rows.map(
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
      nearestDistance,
    };
  });
}

export function ocrNameQueries(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map(cleanOcrName)
    .filter((line) => line.length >= OCR_NAME_MIN_LENGTH)
    .slice(0, OCR_MAX_NAME_LINES);
  const joined = cleanOcrName(lines.join(" "));
  return [...new Set([joined, ...lines])].filter(
    (query) => query.length >= OCR_NAME_MIN_LENGTH,
  );
}

export function cleanOcrName(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}',\- ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSetLine(setCode: string, setLineTokens: string[]): boolean {
  const code = normalizeForMatch(setCode);
  return (
    code.length >= 2 && setLineTokens.some((token) => token.includes(code))
  );
}

export interface CardTextMatchResult extends CardMatchSearchResult {
  ocr: OcrDiagnostics;
}

export async function findCardMatchesByText(
  jwtClaims: string,
  {
    gameKey,
    lang,
    embeddings,
    readout,
  }: {
    gameKey: string;
    lang: string;
    embeddings: CardSearchEmbeddings;
    readout: OcrReadout;
  },
): Promise<CardTextMatchResult> {
  const nameQueries = ocrNameQueries(readout.name);
  const noMatch: CardTextMatchResult = {
    message: "No card matched the text on the card.",
    success: true,
    data: null,
    nearestDistance: null,
    ocr: { readout, matchedName: null, nameScore: null },
  };
  if (nameQueries.length === 0) return noMatch;

  const embeddingStr = vectorLiteral(embeddings.embedding)!;
  const setLineTokens = extractOcrTokens(readout.setLine);

  return authQuery(jwtClaims, async (tx) => {
    await tx.execute(
      sql.raw(
        `SET LOCAL pg_trgm.similarity_threshold = ${OCR_NAME_MIN_SIMILARITY}`,
      ),
    );
    let rows: Record<string, unknown>[] = [];
    for (const nameQuery of nameQueries) {
      const result = await tx.execute(sql`
        SELECT
          card_id,
          name,
          set_code,
          similarity(name, ${nameQuery}) AS name_score,
          embedding <=> ${embeddingStr}::vector(128) AS distance
        FROM cards
        WHERE game_key = ${gameKey} AND lang = ${lang} AND name % ${nameQuery}
        ORDER BY name_score DESC, distance ASC
        LIMIT ${OCR_NAME_CANDIDATE_LIMIT}
      `);
      if (
        result.rows.length > 0 &&
        (rows.length === 0 ||
          (result.rows[0].name_score as number) >
            (rows[0].name_score as number))
      ) {
        rows = result.rows;
      }
    }
    if (rows.length === 0) return noMatch;

    const matchedName = rows[0].name as string;
    const nameScore = rows[0].name_score as number;
    const ocr: OcrDiagnostics = { readout, matchedName, nameScore };

    const printings = rows
      .filter((row) => row.name === matchedName)
      .map((row) => ({
        id: row.card_id as string,
        cardId: row.card_id as string,
        setCode: row.set_code as string,
        distance: row.distance as number,
        setLineMatch: matchesSetLine(row.set_code as string, setLineTokens),
      }))
      .sort(
        (a, b) =>
          Number(b.setLineMatch) - Number(a.setLineMatch) ||
          a.distance - b.distance,
      );

    const data: SearchCardMatch[] = withConfidence(
      printings.slice(0, MATCH_LIMIT),
    ).map(({ id, cardId, distance, confidence }) => ({
      id,
      cardId,
      distance,
      confidence,
    }));

    return {
      message: "Matched card by the text on the card.",
      success: true,
      data,
      nearestDistance: printings[0].distance,
      ocr,
    };
  });
}

export async function attachMatchedCards<T extends CardMatchSearchResult>(
  result: T,
  gameKey: string,
  lang: string,
): Promise<T> {
  const matches = result.data;
  const resolved = resolveCardSearchForGame(gameKey, lang);
  if (!matches || matches.length === 0 || !resolved) return result;

  const leaderDistance = matches[0].distance;
  const data = await Promise.all(
    matches.map(async (match) => {
      if (match.distance - leaderDistance > CLOSE_MATCH_DELTA) return match;
      const found = await searchCardById(resolved, match.cardId);
      return found.success && found.data ? { ...match, card: found.data } : match;
    }),
  );
  return { ...result, data };
}
