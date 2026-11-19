import type { CollectionCsvImportRow } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  catalogPrintingIsListedSql,
  shownPrintingFirstOrderSql,
} from "./card-search/catalog-printing-order";
import type { ResolvedCardSearch } from "./interfaces/card-search";
import type { CatalogImportCandidate } from "./interfaces/collection-csv-import";
import { textArraySql } from "./sql-arrays";

function lower(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function unpaddedNumber(value: string | null | undefined): string {
  return lower(value).replace(/^0+/, "");
}

function frontFaceName(name: string): string {
  return lower(name.split(" // ")[0]);
}

function catalogIdCandidates(catalogId: string): string[] {
  return /^\d+$/.test(catalogId) ? [catalogId, `tcgp-${catalogId}`] : [catalogId.toLowerCase(), catalogId];
}

function sameSet(row: CollectionCsvImportRow, candidate: CatalogImportCandidate): boolean {
  return (
    (!!row.setCode && lower(row.setCode) === lower(candidate.set_code)) ||
    (!!row.setName && lower(row.setName) === lower(candidate.set_name))
  );
}

function sameNumber(row: CollectionCsvImportRow, candidate: CatalogImportCandidate): boolean {
  const number = unpaddedNumber(row.collectorNumber);
  const candidateNumber = lower(candidate.collector_number);
  const set = lower(row.setCode);
  return (
    unpaddedNumber(candidate.collector_number) === number ||
    (!!set && (candidateNumber === `${set}-${lower(row.collectorNumber)}` || candidateNumber === `${set}${lower(row.collectorNumber)}`))
  );
}

function sameName(row: CollectionCsvImportRow, candidate: CatalogImportCandidate): boolean {
  return lower(candidate.name) === lower(row.name) || frontFaceName(candidate.name) === frontFaceName(row.name);
}

export function pickPrintingCandidate(
  row: CollectionCsvImportRow,
  candidates: CatalogImportCandidate[],
): CatalogImportCandidate | null {
  const printings = candidates.filter(
    (candidate) => sameSet(row, candidate) && sameNumber(row, candidate),
  );
  return printings.find((candidate) => sameName(row, candidate)) ?? (printings.length === 1 ? printings[0] : null);
}

export function pickNamedCandidate(
  row: CollectionCsvImportRow,
  candidatesInShownOrder: CatalogImportCandidate[],
): CatalogImportCandidate | null {
  const named = candidatesInShownOrder.filter((candidate) => sameName(row, candidate));
  return (
    named.find((candidate) => sameSet(row, candidate) && !!row.collectorNumber && sameNumber(row, candidate)) ??
    named.find((candidate) => sameSet(row, candidate)) ??
    named[0] ??
    null
  );
}

function selectCandidates(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  filter: SQL,
): Promise<CatalogImportCandidate[]> {
  return db
    .execute<CatalogImportCandidate & Record<string, unknown>>(sql`
      SELECT card_id, name, set_code, set_name, collector_number
      FROM cards
      WHERE game_key = ${gameKey} AND lang = ${lang} AND data IS NOT NULL
        AND ${catalogPrintingIsListedSql(adapter)} AND ${filter}
      ORDER BY ${sql.join(shownPrintingFirstOrderSql(adapter), sql`, `)}
    `)
    .then((result) => result.rows);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function resolveCollectionCsvRows(
  resolved: ResolvedCardSearch,
  rows: CollectionCsvImportRow[],
): Promise<Map<number, string>> {
  const cardIdByLine = new Map<number, string>();
  const unresolved = () => rows.filter((row) => !cardIdByLine.has(row.lineNumber));

  const catalogIds = unique(rows.flatMap((row) => (row.catalogId ? catalogIdCandidates(row.catalogId) : [])));
  if (catalogIds.length > 0) {
    const found = await selectCandidates(resolved, sql`card_id = ANY(${textArraySql(catalogIds)})`);
    const foundIds = new Set(found.map((candidate) => candidate.card_id));
    for (const row of rows) {
      const id = row.catalogId ? catalogIdCandidates(row.catalogId).find((candidate) => foundIds.has(candidate)) : undefined;
      if (id) cardIdByLine.set(row.lineNumber, id);
    }
  }

  const printingRows = unresolved().filter((row) => row.collectorNumber && (row.setCode || row.setName));
  if (printingRows.length > 0) {
    const setCodes = unique(printingRows.map((row) => lower(row.setCode)));
    const setNames = unique(printingRows.map((row) => lower(row.setName)));
    const numbers = unique(printingRows.map((row) => unpaddedNumber(row.collectorNumber)));
    const compositeNumbers = unique(
      printingRows.flatMap((row) =>
        row.setCode
          ? [`${lower(row.setCode)}-${lower(row.collectorNumber)}`, `${lower(row.setCode)}${lower(row.collectorNumber)}`]
          : [],
      ),
    );
    const found = await selectCandidates(
      resolved,
      sql`(lower(set_code) = ANY(${textArraySql(setCodes)}) OR lower(set_name) = ANY(${textArraySql(setNames)}))
        AND (ltrim(lower(collector_number), '0') = ANY(${textArraySql(numbers)}) OR lower(collector_number) = ANY(${textArraySql(compositeNumbers)}))`,
    );
    for (const row of printingRows) {
      const picked = pickPrintingCandidate(row, found);
      if (picked) cardIdByLine.set(row.lineNumber, picked.card_id);
    }
  }

  const nameRows = unresolved();
  if (nameRows.length > 0) {
    const names = unique(nameRows.map((row) => lower(row.name)));
    const found = await selectCandidates(resolved, sql`lower(name) = ANY(${textArraySql(names)})`);
    for (const row of nameRows) {
      const picked = pickNamedCandidate(row, found);
      if (picked) cardIdByLine.set(row.lineNumber, picked.card_id);
    }
  }

  const frontFaceRows = unresolved();
  if (frontFaceRows.length > 0) {
    const names = unique(frontFaceRows.map((row) => frontFaceName(row.name)));
    const found = await selectCandidates(
      resolved,
      sql`name LIKE '% // %' AND lower(split_part(name, ' // ', 1)) = ANY(${textArraySql(names)})`,
    );
    for (const row of frontFaceRows) {
      const picked = pickNamedCandidate(row, found);
      if (picked) cardIdByLine.set(row.lineNumber, picked.card_id);
    }
  }

  return cardIdByLine;
}
