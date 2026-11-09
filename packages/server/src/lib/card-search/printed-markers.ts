import {
  RIFTBOUND_COLLECTOR_NUMBER_PATTERN,
  RIFTBOUND_PROMO_MARKER_PATTERN,
} from "../constants/printed-markers";

export function readRiftboundPromoMarker(setLine: string): boolean | null {
  for (const line of setLine.split(/\r?\n/)) {
    const collectorNumber = RIFTBOUND_COLLECTOR_NUMBER_PATTERN.exec(line);
    if (!collectorNumber) continue;
    const afterNumber = line.slice(
      collectorNumber.index + collectorNumber[0].length,
    );
    return RIFTBOUND_PROMO_MARKER_PATTERN.test(afterNumber);
  }
  return null;
}
