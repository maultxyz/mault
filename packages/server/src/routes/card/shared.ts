import type {
  CardSearchDiagnostics,
  CardSearchEmbeddings,
  OcrDiagnostics,
  OcrField,
  OcrReadout,
  OcrRegion,
  SearchCardMatch,
  SearchNoMatchReason,
} from "@magic-vault/shared";
import { CLOSE_MATCH_DELTA, DISTANCE_THRESHOLD } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";
import { resolveCardSearchForGame } from "../../lib/card-search/resolve";
import { searchCardsByIds } from "../../lib/card-search/stored-cards";
import {
  DUPLICATE_PRINTING_MAX_DISTANCE,
  MATCH_CONFIDENCE_TEMPERATURE,
  MATCH_MAX_DISTANCE_RATIO,
  CARD_MATCH_LIMIT,
  CARD_MATCH_RUNNER_UP_SEARCH_LIMIT,
} from "../../lib/constants/card-search";
import { SHOW_SCAN_LOGS } from "../../lib/constants/logging";
import {
  OCR_MAX_NAME_LINES,
  OCR_NAME_CANDIDATE_LIMIT,
  OCR_NAME_MIN_LENGTH,
  OCR_NAME_MIN_SIMILARITY,
} from "../../lib/constants/ocr";
import type {
  CardMatchSearchResult,
  CardTextMatchParams,
  CardTextMatchResult,
} from "../../lib/interfaces/card-search";
import { ocrRegions } from "../../lib/ocr";

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

export function parsePreferredSetCode(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export async function findCardMatches(
  jwtClaims: string,
  {
    gameKey,
    lang,
    embeddings,
    preferredSetCode,
  }: {
    gameKey: string;
    lang: string;
    embeddings: CardSearchEmbeddings;
    preferredSetCode?: string;
  },
): Promise<CardMatchSearchResult> {
  const embeddingStr = vectorLiteral(embeddings.embedding)!;

  return authQuery(jwtClaims, async (tx) => {
    await tx.execute(sql`
      SELECT
        set_config('hnsw.iterative_scan', 'strict_order', true),
        set_config('hnsw.max_scan_tuples', '100000', true),
        set_config('hnsw.ef_search', '200', true)
    `);

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
        LIMIT ${CARD_MATCH_RUNNER_UP_SEARCH_LIMIT}
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
        matches.rows.slice(0, CARD_MATCH_LIMIT).map((row) => ({
          id: row.card_id as string,
          cardId: row.card_id as string,
          name: row.name as string,
          setCode: row.set_code as string,
          distance: row.distance as number,
          leaderDistance: row.leader_distance as number,
        })),
      ),
    );

    if (SHOW_SCAN_LOGS) {
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

    const [leader] = rows;
    const preferred = preferredSetCode
      ? await tx.execute(sql`
          SELECT card_id, embedding <=> ${embeddingStr}::vector(128) AS distance
          FROM cards
          WHERE game_key = ${gameKey}
            AND lang = ${lang}
            AND name = ${leader.name}
            AND lower(set_code) = lower(${preferredSetCode})
          ORDER BY distance
          LIMIT 1
        `)
      : null;
    const preferredRow = preferred?.rows[0];
    const accepted = preferredRow
      ? [
          {
            ...leader,
            id: preferredRow.card_id as string,
            cardId: preferredRow.card_id as string,
            distance: preferredRow.distance as number,
          },
          ...rows.filter((row) => row.name !== leader.name),
        ]
      : rows;

    const matchList: SearchCardMatch[] = accepted.map(
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

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

function ocrNumberCandidates(text: string): string[] {
  return (text.replace(/\/\s*\d+/g, " ").match(/\d+/g) ?? []).map(
    stripLeadingZeros,
  );
}

function matchesCollectorNumber(
  collectorNumber: string | null,
  numberCandidates: string[],
): boolean {
  const digits = collectorNumber?.match(/\d+/g)?.at(-1);
  return !!digits && numberCandidates.includes(stripLeadingZeros(digits));
}

export async function findCardMatchesByText(
  jwtClaims: string,
  { gameKey, lang, embeddings, readout, preferredSetCode }: CardTextMatchParams,
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
  const numberCandidates = ocrNumberCandidates(
    readout.number || readout.setLine,
  );

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
          collector_number,
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

    const printings = rows
      .filter((row) => row.name === matchedName)
      .map((row) => ({
        id: row.card_id as string,
        cardId: row.card_id as string,
        setCode: row.set_code as string,
        distance: row.distance as number,
        setLineMatch: matchesSetLine(row.set_code as string, setLineTokens),
        numberMatch: matchesCollectorNumber(
          row.collector_number as string | null,
          numberCandidates,
        ),
        isPreferredSet:
          !!preferredSetCode &&
          (row.set_code as string).toLowerCase() ===
            preferredSetCode.toLowerCase(),
      }))
      .sort(
        (a, b) =>
          Number(b.isPreferredSet) - Number(a.isPreferredSet) ||
          Number(b.setLineMatch) - Number(a.setLineMatch) ||
          Number(b.numberMatch) - Number(a.numberMatch) ||
          a.distance - b.distance,
      );

    const ocr: OcrDiagnostics = {
      readout,
      matchedName,
      nameScore,
      printingConfirmed: printings[0].setLineMatch || printings[0].numberMatch,
    };

    const data: SearchCardMatch[] = withConfidence(
      printings.slice(0, CARD_MATCH_LIMIT),
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

function mergeReadouts(primary: OcrReadout, fallback: OcrReadout): OcrReadout {
  const merge = (field: OcrField) =>
    [primary[field], fallback[field]].filter(Boolean).join("\n");
  return {
    name: merge("name"),
    setLine: merge("setLine"),
    number: merge("number"),
  };
}

export async function findCardMatchesByOcr(
  jwtClaims: string,
  buffer: Buffer,
  regions: OcrRegion[],
  params: Omit<CardTextMatchParams, "readout">,
): Promise<CardTextMatchResult> {
  const readout = await ocrRegions(
    buffer,
    regions.filter((region) => !region.fallback),
  );
  const first = await findCardMatchesByText(jwtClaims, { ...params, readout });

  const needsName = !first.data;
  const needsPrinting = !!first.data && !first.ocr.printingConfirmed;
  const fallbacks = regions.filter(
    (region) =>
      region.fallback &&
      (needsName || (needsPrinting && region.field !== "name")),
  );
  if (fallbacks.length === 0) return first;

  const second = await findCardMatchesByText(jwtClaims, {
    ...params,
    readout: mergeReadouts(readout, await ocrRegions(buffer, fallbacks)),
  });
  const used = second.data ? second : first;
  return { ...used, ocr: { ...used.ocr, usedFallback: true } };
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
  const isClose = (match: SearchCardMatch) =>
    match.distance - leaderDistance <= CLOSE_MATCH_DELTA;
  const cards = await searchCardsByIds(
    resolved,
    matches.filter(isClose).map((match) => match.cardId),
  );
  const data = matches.map((match) => {
    const card = isClose(match) ? cards.get(match.cardId) : undefined;
    return card ? { ...match, card } : match;
  });
  return { ...result, data };
}
