import {
  QUICK_ADD_FOIL_MARKER_PATTERN,
  QUICK_ADD_NO_LOCATION,
  QUICK_ADD_PRINTING_PATTERN,
  QUICK_ADD_QUANTITY_PATTERN,
} from "@/lib/constants/cards";
import type { ParsedQuickAddLine } from "@/lib/interfaces/cards";
import type { PlayingCard } from "@magic-vault/shared";
import { MANUAL_CARD_ADD_MAX_QUANTITY } from "@magic-vault/shared";

export function parseQuickAddLine(line: string): ParsedQuickAddLine {
  let remaining = line.trim();
  const isFoil = remaining.search(QUICK_ADD_FOIL_MARKER_PATTERN) !== -1;
  remaining = remaining.replace(QUICK_ADD_FOIL_MARKER_PATTERN, " ").trim();

  let quantity = 1;
  const quantityMatch = QUICK_ADD_QUANTITY_PATTERN.exec(remaining);
  const parsedQuantity = quantityMatch ? Number(quantityMatch[1]) : 0;
  if (parsedQuantity >= 1 && parsedQuantity <= MANUAL_CARD_ADD_MAX_QUANTITY) {
    quantity = parsedQuantity;
    remaining = remaining.slice(quantityMatch![0].length);
  }

  const printingMatch = QUICK_ADD_PRINTING_PATTERN.exec(remaining);
  if (!printingMatch) return { quantity, cardName: remaining.trim(), isFoil };
  return {
    quantity,
    cardName: remaining.slice(0, printingMatch.index).trim(),
    setCode: printingMatch[1].toLowerCase(),
    collectorNumber: printingMatch[2]?.toLowerCase(),
    isFoil,
  };
}

export function matchesQuickAddCollectorNumber(
  card: PlayingCard,
  collectorNumber: string | undefined,
): boolean {
  return (
    !collectorNumber ||
    card.collectorNumber?.toLowerCase() === collectorNumber
  );
}

export function storedTextOrEmpty(stored: string | null): string {
  return stored ?? "";
}

export function storedLocationOrNone(stored: string | null): string {
  return stored ?? QUICK_ADD_NO_LOCATION;
}
