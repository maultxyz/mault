import type { SCAN_TIMELINE_GROUPINGS } from "../constants/scan-timeline.constant";

export type ScanTimelineGrouping = (typeof SCAN_TIMELINE_GROUPINGS)[number];

export interface ScanTimelineBucket {
  bucketKey: string;
  cardCount: number;
}

export interface ScanTimelineBuckets {
  buckets: ScanTimelineBucket[];
}

export interface ScanTimelineBlock<CardEntry> {
  bucketKey: string;
  cardCount: number;
  cards: CardEntry[];
}
