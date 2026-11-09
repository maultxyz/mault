import type {
  CardMatchSegment,
  CardNameMatch,
  CardNameTrigramIndex,
} from "./interfaces/card-match-index";

const trigramIds = new Map<string, number>();

function trigramId(trigram: string): number {
  let id = trigramIds.get(trigram);
  if (id === undefined) {
    id = trigramIds.size;
    trigramIds.set(trigram, id);
  }
  return id;
}

export function nameTrigrams(text: string): string[] {
  const trigrams = new Set<string>();
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    const padded = [" ", " ", ...word, " "];
    for (let i = 0; i + 3 <= padded.length; i++) {
      trigrams.add(padded.slice(i, i + 3).join(""));
    }
  }
  return [...trigrams];
}

export function nameSimilarity(a: string, b: string): number {
  const left = new Set(nameTrigrams(a));
  const right = nameTrigrams(b);
  if (left.size === 0 || right.length === 0) return 0;
  const shared = right.filter((trigram) => left.has(trigram)).length;
  return shared / (left.size + right.length - shared);
}

const indexBySegment = new WeakMap<CardMatchSegment, CardNameTrigramIndex>();

function nameTrigramIndex(segment: CardMatchSegment): CardNameTrigramIndex {
  const cached = indexBySegment.get(segment);
  if (cached) return cached;
  const rowsByName = new Map<string, number[]>();
  segment.names.forEach((name, row) => {
    const rows = rowsByName.get(name);
    if (rows) rows.push(row);
    else rowsByName.set(name, [row]);
  });
  const names = [...rowsByName.keys()];
  const offsets = new Int32Array(names.length + 1);
  const ids: number[] = [];
  names.forEach((name, index) => {
    for (const trigram of nameTrigrams(name)) ids.push(trigramId(trigram));
    offsets[index + 1] = ids.length;
  });
  const index: CardNameTrigramIndex = {
    names,
    rowsByName: names.map((name) => rowsByName.get(name)!),
    offsets,
    trigramIds: Int32Array.from(ids),
  };
  indexBySegment.set(segment, index);
  return index;
}

export function cardsWithSimilarName(
  segments: CardMatchSegment[],
  query: string,
  minSimilarity: number,
): CardNameMatch[] {
  const queryTrigrams = nameTrigrams(query);
  if (queryTrigrams.length === 0) return [];
  const indexes = segments.map(
    (segment) => [segment, nameTrigramIndex(segment)] as const,
  );
  const queryIds = new Set(
    queryTrigrams.flatMap((trigram) => trigramIds.get(trigram) ?? []),
  );
  const matches: CardNameMatch[] = [];
  for (const [segment, index] of indexes) {
    for (let nameIndex = 0; nameIndex < index.names.length; nameIndex++) {
      const start = index.offsets[nameIndex];
      const end = index.offsets[nameIndex + 1];
      let shared = 0;
      for (let i = start; i < end; i++) {
        if (queryIds.has(index.trigramIds[i])) shared++;
      }
      if (shared === 0) continue;
      const score = shared / (queryTrigrams.length + (end - start) - shared);
      if (score < minSimilarity) continue;
      for (const row of index.rowsByName[nameIndex]) {
        matches.push({ segment, row, score });
      }
    }
  }
  return matches;
}
