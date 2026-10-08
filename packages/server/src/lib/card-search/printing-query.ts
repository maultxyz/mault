import {
  PRINTED_TOTAL_NUMBER_PATTERN,
  SET_AND_NUMBER_PATTERN,
  SINGLE_TOKEN_PATTERN,
} from "../constants/card-search";
import type { PrintingQuery } from "../interfaces/card-search";

export function parsePrintingQueries(query: string): PrintingQuery[] {
  const trimmed = query.trim();
  const printedTotal = PRINTED_TOTAL_NUMBER_PATTERN.exec(trimmed);
  if (printedTotal) return [{ setCode: null, number: printedTotal[1] }];

  const queries: PrintingQuery[] = [];
  const single = SINGLE_TOKEN_PATTERN.exec(trimmed);
  if (single) queries.push({ setCode: null, number: single[1] });
  const setAndNumber = SET_AND_NUMBER_PATTERN.exec(trimmed);
  if (setAndNumber) {
    queries.push({ setCode: setAndNumber[1], number: setAndNumber[2] });
  }
  return queries;
}
