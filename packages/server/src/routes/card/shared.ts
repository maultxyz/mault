import type {
  CardSearchEmbeddings,
  OcrDiagnostics,
  OcrField,
  OcrReadout,
  OcrRegion,
  OcrRegionTrace,
  PlayingCard,
  SearchCardMatch,
  SearchNoMatchReason,
} from "@magic-vault/shared";
import { CLOSE_MATCH_DELTA, DISTANCE_THRESHOLD } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
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
  OCR_MATCH_MAX_IMAGE_DISTANCE,
  OCR_MAX_NAME_LINES,
  OCR_NAME_CANDIDATE_LIMIT,
  OCR_NAME_MIN_LENGTH,
  OCR_NAME_MIN_SIMILARITY,
  OCR_PRINTED_NUMBER_CANDIDATE_LIMIT,
} from "../../lib/constants/ocr";
import {
  cardMatchSegments,
  loadedCardMatchSegments,
} from "../../lib/card-match-index";
import {
  cardRowDistance,
  closestPrintingInSets,
  faceDistance,
  nearestCardFaces,
  normalizedEmbedding,
} from "../../lib/card-match-search";
import { cardsWithSimilarName } from "../../lib/card-name-trigrams";
import type { OcrCandidateRow } from "../../lib/interfaces/card-match-index";
import type {
  CardMatchCandidate,
  CardMatchSearchResult,
  CardTextMatchParams,
  CardTextMatchResult,
  CollectionMatchScope,
} from "../../lib/interfaces/card-search";
import { ocrRegions } from "../../lib/ocr";
import { stripLeadingZeros } from "../../lib/ocr-calibration/match";

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

export function vectorLiteral(embedding: number[] | null): string | null {
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

export function cardDistanceSql(embeddingStr: string): SQL {
  return sql`LEAST(embedding <=> ${embeddingStr}::vector(128), back_embedding <=> ${embeddingStr}::vector(128))`;
}

export function langFilter({ lang, matchAllLanguages }: CollectionMatchScope): SQL {
  return matchAllLanguages ? sql`` : sql`AND lang = ${lang}`;
}

export function matchingExclusionFilter({ gameKey, lang }: CollectionMatchScope): SQL {
  const excludedFromMatchingSql =
    resolveCardSearchForGame(gameKey, lang)?.adapter.excludedFromMatchingSql;
  return excludedFromMatchingSql
    ? sql`AND NOT coalesce(${excludedFromMatchingSql}, false)`
    : sql``;
}

function trimmedSetCode(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseSetCodeList(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.flatMap((code) => trimmedSetCode(code) ?? [])
      : [];
  } catch {
    return [];
  }
}

export function parsePreferredSetCodes(body: Record<string, unknown>): string[] {
  const legacySetCode = trimmedSetCode(body["preferredSetCode"]);
  return [
    ...new Set([
      ...parseSetCodeList(body["preferredSetCodes"]),
      ...(legacySetCode ? [legacySetCode] : []),
    ]),
  ];
}

function isPreferredSetCode(setCode: string, preferredSetCodes: string[] = []) {
  const wanted = setCode.toLowerCase();
  return preferredSetCodes.some((code) => code.toLowerCase() === wanted);
}

export async function findCardMatches({
  embeddings,
  preferredSetCodes = [],
  skipsUnloadedIndex = false,
  ...scope
}: CollectionMatchScope & {
  embeddings: CardSearchEmbeddings;
  preferredSetCodes?: string[];
  skipsUnloadedIndex?: boolean;
}): Promise<CardMatchSearchResult> {
  const { gameKey, lang } = scope;
  const segments = skipsUnloadedIndex
    ? loadedCardMatchSegments(scope)
    : await cardMatchSegments(scope);
  const query = normalizedEmbedding(embeddings.embedding);
  const nearest = nearestCardFaces(
    segments,
    query,
    CARD_MATCH_RUNNER_UP_SEARCH_LIMIT,
  );
  const matches: CardMatchCandidate[] = nearest.map((face) => ({
    cardId: face.segment.cardIds[face.row],
    lang: face.segment.lang,
    name: face.segment.names[face.row],
    setCode: face.segment.setCodes[face.row],
    rarePrinting: face.segment.rarePrinting[face.row] === 1,
    distance: face.distance,
    leaderDistance: faceDistance(face, nearest[0]),
  }));

  const leaderName = matches[0]?.name;
  const runnerUp = matches.find((match) => match.name !== leaderName);
  const runnerUpDistance = runnerUp?.distance ?? null;

  const candidates = poolDuplicatePrintings(
    withConfidence(
      matches.slice(0, CARD_MATCH_LIMIT).map((match) => ({
        id: match.cardId,
        cardId: match.cardId,
        lang: match.lang,
        name: match.name,
        setCode: match.setCode,
        distance: match.distance,
        leaderDistance: match.leaderDistance,
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
        runnerUpName: runnerUp?.name ?? null,
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

  const topMatch = matches[0];
  const regularMatch = topMatch?.rarePrinting
    ? matches.find(
        (match) =>
          !match.rarePrinting &&
          match.name === topMatch.name &&
          match.leaderDistance <= DUPLICATE_PRINTING_MAX_DISTANCE,
      )
    : undefined;
  const ranked = regularMatch
    ? [
        {
          ...rows[0],
          id: regularMatch.cardId,
          cardId: regularMatch.cardId,
          lang: regularMatch.lang,
          setCode: regularMatch.setCode,
          distance: regularMatch.distance,
        },
        ...rows.filter((row) => row.cardId !== regularMatch.cardId),
      ]
    : rows;

  const [leader] = ranked;
  const leaderSegment = segments.find((segment) => segment.lang === leader.lang);
  const preferred =
    preferredSetCodes.length > 0 && leaderSegment
      ? closestPrintingInSets(leaderSegment, leader.name, preferredSetCodes, query)
      : null;
  const accepted = preferred
    ? [
        {
          ...leader,
          id: preferred.segment.cardIds[preferred.row],
          cardId: preferred.segment.cardIds[preferred.row],
          distance: preferred.distance,
        },
        ...ranked.filter((row) => row.name !== leader.name),
      ]
    : ranked;

  const matchList: SearchCardMatch[] = accepted.map(
    ({ id, cardId, lang: matchLang, distance, confidence }) => ({
      id,
      cardId,
      lang: matchLang,
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

function ocrNumberCandidates(text: string): string[] {
  return (text.replace(/\/\s*\d+/g, " ").match(/\d+/g) ?? []).map(
    stripLeadingZeros,
  );
}

export function printedCollectorNumberCandidates(text: string): string[] {
  const numbersBeforeSlash = [...text.matchAll(/(\d+)\s*\//g)].map((match) =>
    stripLeadingZeros(match[1]),
  );
  return [
    ...new Set(
      numbersBeforeSlash.length > 0
        ? numbersBeforeSlash
        : ocrNumberCandidates(text),
    ),
  ];
}

export function printedSetCodeMatchLength(
  setCode: string,
  printedTokens: string[],
): number {
  const code = normalizeForMatch(setCode);
  return code.length >= 2 &&
    printedTokens.some((token) => token.startsWith(code))
    ? code.length
    : 0;
}

function matchesCollectorNumber(
  collectorNumber: string | null,
  numberCandidates: string[],
): boolean {
  const digits = collectorNumber?.match(/\d+/g)?.at(-1);
  return !!digits && numberCandidates.includes(stripLeadingZeros(digits));
}

function isLeadingPrintingConfirmed(
  printings: { setCode: string; setLineMatch: boolean; numberMatch: boolean }[],
): boolean {
  const [leader] = printings;
  if (leader.numberMatch) return true;
  return (
    leader.setLineMatch &&
    printings.filter((printing) => printing.setCode === leader.setCode)
      .length === 1
  );
}

function leadingCollectorNumber(collectorNumber: string | null): string | null {
  const digits = collectorNumber?.match(/[0-9]+/)?.[0];
  return digits ? digits.replace(/^0+(?=[0-9])/, "") : null;
}

export async function findCardMatchesByText({
  embeddings,
  readout,
  preferredSetCodes,
  ...scope
}: CardTextMatchParams): Promise<CardTextMatchResult> {
  const nameQueries = ocrNameQueries(readout.name);
  const noMatch: CardTextMatchResult = {
    message: "No card matched the text on the card.",
    success: true,
    data: null,
    nearestDistance: null,
    ocr: { readout, matchedName: null, nameScore: null },
  };
  if (nameQueries.length === 0) return noMatch;

  const segments = await cardMatchSegments(scope);
  const query = normalizedEmbedding(embeddings.embedding);
  const setLineTokens = extractOcrTokens(readout.setLine);
  const numberCandidates = ocrNumberCandidates(
    readout.number || readout.setLine,
  );

  let rows: (OcrCandidateRow & { score: number })[] = [];
  for (const nameQuery of nameQueries) {
    const matches = cardsWithSimilarName(
      segments,
      nameQuery,
      OCR_NAME_MIN_SIMILARITY,
    )
      .map((match) => ({
        ...match,
        distance: cardRowDistance(match.segment, match.row, query),
      }))
      .sort((a, b) => b.score - a.score || a.distance - b.distance)
      .slice(0, OCR_NAME_CANDIDATE_LIMIT);
    if (
      matches.length > 0 &&
      (rows.length === 0 || matches[0].score > rows[0].score)
    ) {
      rows = matches;
    }
  }
  if (rows.length === 0) return noMatch;

  const nameOf = ({ segment, row }: OcrCandidateRow) => segment.names[row];
  const matchedName = nameOf(rows[0]);
  const nameScore = rows[0].score;

  const printings = rows
    .filter((candidate) => nameOf(candidate) === matchedName)
    .map(({ segment, row, distance }) => ({
      id: segment.cardIds[row],
      cardId: segment.cardIds[row],
      lang: segment.lang,
      setCode: segment.setCodes[row],
      distance,
      setLineMatch: matchesSetLine(segment.setCodes[row], setLineTokens),
      numberMatch: matchesCollectorNumber(
        segment.collectorNumbers[row],
        numberCandidates,
      ),
      isPreferredSet: isPreferredSetCode(
        segment.setCodes[row],
        preferredSetCodes,
      ),
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
    printingConfirmed: isLeadingPrintingConfirmed(printings),
  };

  const data: SearchCardMatch[] = withConfidence(
    printings.slice(0, CARD_MATCH_LIMIT),
  ).map(({ id, cardId, lang, distance, confidence }) => ({
    id,
    cardId,
    lang,
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
}

async function findCardMatchesByPrintedSetAndNumber({
  embeddings,
  readout,
  preferredSetCodes,
  ...scope
}: CardTextMatchParams): Promise<CardTextMatchResult> {
  const printedText = [readout.setLine, readout.number]
    .filter(Boolean)
    .join("\n");
  const numberCandidates = new Set(
    printedCollectorNumberCandidates(printedText),
  );
  const noMatch: CardTextMatchResult = {
    message: "No card matched the set code and number on the card.",
    success: true,
    data: null,
    nearestDistance: null,
    ocr: { readout, matchedName: null, nameScore: null },
  };
  if (numberCandidates.size === 0) return noMatch;

  const segments = await cardMatchSegments(scope);
  const query = normalizedEmbedding(embeddings.embedding);
  const printedTokens = extractOcrTokens(printedText);
  const rows: OcrCandidateRow[] = [];
  for (const segment of segments) {
    segment.collectorNumbers.forEach((collectorNumber, row) => {
      const number = leadingCollectorNumber(collectorNumber);
      if (number && numberCandidates.has(number)) {
        rows.push({ segment, row, distance: cardRowDistance(segment, row, query) });
      }
    });
  }
  if (rows.length === 0) return noMatch;

  const printings = rows
    .sort((a, b) => a.distance - b.distance)
    .slice(0, OCR_PRINTED_NUMBER_CANDIDATE_LIMIT)
    .map(({ segment, row, distance }) => ({
      id: segment.cardIds[row],
      cardId: segment.cardIds[row],
      lang: segment.lang,
      distance,
      setCodeMatchLength: printedSetCodeMatchLength(
        segment.setCodes[row],
        printedTokens,
      ),
      isPreferredSet: isPreferredSetCode(
        segment.setCodes[row],
        preferredSetCodes,
      ),
    }))
    .sort(
      (a, b) =>
        Number(b.isPreferredSet) - Number(a.isPreferredSet) ||
        b.setCodeMatchLength - a.setCodeMatchLength ||
        a.distance - b.distance,
    );

  const data: SearchCardMatch[] = withConfidence(
    printings.slice(0, CARD_MATCH_LIMIT),
  ).map(({ id, cardId, lang, distance, confidence }) => ({
    id,
    cardId,
    lang,
    distance,
    confidence,
  }));

  return {
    message: "Matched card by the set code and number on the card.",
    success: true,
    data,
    nearestDistance: printings[0].distance,
    ocr: {
      readout,
      matchedName: null,
      nameScore: null,
      printingConfirmed: printings[0].setCodeMatchLength > 0,
    },
  };
}

function withoutDistantUnconfirmedMatch(
  result: CardTextMatchResult,
): CardTextMatchResult {
  const leader = result.data?.[0];
  if (
    leader &&
    !result.ocr.printingConfirmed &&
    leader.distance > OCR_MATCH_MAX_IMAGE_DISTANCE
  ) {
    return {
      message: "The card matched by text looks too different from the scan.",
      success: true,
      data: null,
      nearestDistance: leader.distance,
      ocr: result.ocr,
    };
  }
  return result;
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

function isCloserTextMatch(
  candidate: CardTextMatchResult,
  current: CardTextMatchResult,
): boolean {
  if (!candidate.data) return false;
  if (!current.data) return true;
  const candidateConfirmed = !!candidate.ocr.printingConfirmed;
  const currentConfirmed = !!current.ocr.printingConfirmed;
  if (candidateConfirmed !== currentConfirmed) return candidateConfirmed;
  return candidate.data[0].distance < current.data[0].distance;
}

export async function findCardMatchesByOcr(
  buffer: Buffer,
  regions: OcrRegion[],
  params: Omit<CardTextMatchParams, "readout">,
  trace?: OcrRegionTrace[],
): Promise<CardTextMatchResult> {
  const {
    primary,
    fallback,
    regions: readRegions,
  } = await ocrRegions(buffer, regions, trace);
  const readout = mergeReadouts(primary, fallback);
  const withReadRegions = (result: CardTextMatchResult) => ({
    ...result,
    ocr: { ...result.ocr, regions: readRegions },
  });
  if (
    resolveCardSearchForGame(params.gameKey, params.lang)?.adapter
      .ocrMatchesByPrintedSetAndNumber
  ) {
    return withReadRegions(
      withoutDistantUnconfirmedMatch(
        await findCardMatchesByPrintedSetAndNumber({
          ...params,
          readout,
        }),
      ),
    );
  }
  const nameCandidates = [
    { name: primary.name, fromFallback: false },
    { name: fallback.name, fromFallback: true },
  ].filter(
    (candidate, index, all) =>
      candidate.name &&
      all.findIndex((other) => other.name === candidate.name) === index,
  );
  if (nameCandidates.length === 0) {
    return withReadRegions(
      await findCardMatchesByText({ ...params, readout }),
    );
  }

  const results = await Promise.all(
    nameCandidates.map(async ({ name, fromFallback }) => ({
      fromFallback,
      result: await findCardMatchesByText({
        ...params,
        readout: { ...readout, name },
      }),
    })),
  );
  const closest = results.reduce((best, candidate) =>
    isCloserTextMatch(candidate.result, best.result) ? candidate : best,
  );
  return withReadRegions(
    withoutDistantUnconfirmedMatch({
      ...closest.result,
      ocr: {
        ...closest.result.ocr,
        readout,
        usedFallback: closest.fromFallback,
      },
    }),
  );
}

export async function attachMatchedCards<T extends CardMatchSearchResult>(
  result: T,
  gameKey: string,
  lang: string,
): Promise<T> {
  const matches = result.data;
  if (!matches || matches.length === 0) return result;

  const leaderDistance = matches[0].distance;
  const isClose = (match: SearchCardMatch) =>
    match.distance - leaderDistance <= CLOSE_MATCH_DELTA;
  const matchLang = (match: SearchCardMatch) => match.lang ?? lang;
  const closeMatches = matches.filter(isClose);
  const cardsByLang = new Map(
    await Promise.all(
      [...new Set(closeMatches.map(matchLang))].map(async (cardLang) => {
        const resolved = resolveCardSearchForGame(gameKey, cardLang);
        const cards = resolved
          ? await searchCardsByIds(
              resolved,
              closeMatches
                .filter((match) => matchLang(match) === cardLang)
                .map((match) => match.cardId),
            )
          : new Map<string, PlayingCard>();
        return [cardLang, cards] as const;
      }),
    ),
  );
  const data = matches.map((match) => {
    const cardLang = matchLang(match);
    const card = isClose(match)
      ? cardsByLang.get(cardLang)?.get(match.cardId)
      : undefined;
    if (!card) return match;
    return {
      ...match,
      card: cardLang === lang ? card : { ...card, lang: cardLang },
    };
  });
  return { ...result, data };
}
