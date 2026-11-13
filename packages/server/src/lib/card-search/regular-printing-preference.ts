import type {
  CardMatchCandidate,
  TextRankedPrintingEvidence,
} from "../interfaces/card-search";

export function regularPrintingAmongMatches(
  matches: CardMatchCandidate[],
): CardMatchCandidate | undefined {
  const [leader] = matches;
  if (!leader?.rarePrinting) return undefined;
  return matches.find(
    (match) => !match.rarePrinting && match.name === leader.name,
  );
}

function withoutLeadingZeros(token: string): string {
  return token.replace(/^0+(?=[0-9])/, "");
}

export function readsLetteredCollectorNumber(
  collectorNumber: string | null,
  printedNumberText: string,
): boolean {
  if (!collectorNumber || !/[a-z]/i.test(collectorNumber)) return false;
  const wanted = withoutLeadingZeros(
    collectorNumber.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  );
  if (!/[0-9]/.test(wanted)) return false;
  const tokens = printedNumberText
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((token) => token.length > 0);
  const joinedNeighbours = tokens
    .slice(1)
    .map((token, index) => tokens[index] + token);
  return [...tokens, ...joinedNeighbours].some(
    (token) => withoutLeadingZeros(token) === wanted,
  );
}

export function compareTextRankedPrintings(
  a: TextRankedPrintingEvidence,
  b: TextRankedPrintingEvidence,
): number {
  return (
    Number(b.isPreferredSet) - Number(a.isPreferredSet) ||
    Number(b.matchesPrintedPromo) - Number(a.matchesPrintedPromo) ||
    Number(b.setLineMatch) - Number(a.setLineMatch) ||
    Number(b.letteredNumberMatch) - Number(a.letteredNumberMatch) ||
    Number(b.numberMatch) - Number(a.numberMatch) ||
    Number(b.setTotalMatch) - Number(a.setTotalMatch) ||
    Number(a.rarePrinting) - Number(b.rarePrinting) ||
    a.distance - b.distance
  );
}
