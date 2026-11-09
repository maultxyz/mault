import {
  SCAN_TIMELINE_DAY_LABEL_FORMAT,
  SCAN_TIMELINE_FALLBACK_TIME_ZONE,
  SCAN_TIMELINE_GROUPINGS,
  SCAN_TIMELINE_HOUR_LABEL_FORMAT,
} from "./constants/scan-timeline.constant";
import type {
  ScanTimelineBlock,
  ScanTimelineBucket,
  ScanTimelineGrouping,
} from "./interfaces/scan-timeline.interface";

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function isScanTimelineGrouping(
  value: unknown,
): value is ScanTimelineGrouping {
  return SCAN_TIMELINE_GROUPINGS.some((grouping) => grouping === value);
}

export function deviceTimeZone(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      SCAN_TIMELINE_FALLBACK_TIME_ZONE
    );
  } catch {
    return SCAN_TIMELINE_FALLBACK_TIME_ZONE;
  }
}

export function scanTimelineBucketKey(
  scannedAtMs: number,
  grouping: ScanTimelineGrouping,
): string {
  const scannedAt = new Date(scannedAtMs);
  const dayKey = `${scannedAt.getFullYear()}-${padTwoDigits(scannedAt.getMonth() + 1)}-${padTwoDigits(scannedAt.getDate())}`;
  return grouping === "day"
    ? dayKey
    : `${dayKey}T${padTwoDigits(scannedAt.getHours())}`;
}

export function scanTimelineBucketStart(bucketKey: string): Date {
  const [datePart, hourPart] = bucketKey.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day, hourPart ? Number(hourPart) : 0);
}

export function formatScanTimelineBucketLabel(
  bucketKey: string,
  grouping: ScanTimelineGrouping,
  locale: string,
): string {
  return scanTimelineBucketStart(bucketKey).toLocaleString(
    locale,
    grouping === "day"
      ? SCAN_TIMELINE_DAY_LABEL_FORMAT
      : SCAN_TIMELINE_HOUR_LABEL_FORMAT,
  );
}

export function groupCardsByScanTime<CardEntry extends { scannedAt: number }>(
  cards: CardEntry[],
  grouping: ScanTimelineGrouping,
  buckets: ScanTimelineBucket[] = [],
): ScanTimelineBlock<CardEntry>[] {
  const cardCountByBucketKey = new Map(
    buckets.map((bucket) => [bucket.bucketKey, bucket.cardCount]),
  );
  const blocks: ScanTimelineBlock<CardEntry>[] = [];
  for (const card of cards) {
    const bucketKey = scanTimelineBucketKey(card.scannedAt, grouping);
    const currentBlock = blocks[blocks.length - 1];
    if (currentBlock?.bucketKey === bucketKey) {
      currentBlock.cards.push(card);
      continue;
    }
    blocks.push({ bucketKey, cardCount: 0, cards: [card] });
  }
  for (const block of blocks) {
    block.cardCount = Math.max(
      cardCountByBucketKey.get(block.bucketKey) ?? 0,
      block.cards.length,
    );
  }
  return blocks;
}
