import type { TFunction } from "i18next";
import type { OrgOverview } from "@magic-vault/shared";
import type { ScanLockInfo } from "@/lib/interfaces/stream";

export type HomeWidgetStatus = "empty" | "signed-out" | "ready";

export interface CollectionValueWidgetProps {
  status: HomeWidgetStatus;
  url: string;
  title: string;
  message: string;
  totalValue: string;
  cardCount: string;
  scansToday: string;
  scansThisWeek: string;
}

export interface NotificationsWidgetProps {
  status: HomeWidgetStatus;
  url: string;
  title: string;
  message: string;
  count: number;
  countLabel: string;
  summary: string;
  latestMessage: string;
}

export type ScannerActivityState = "scanning" | "idle" | "unknown";

export interface ScannerActivityWidgetProps {
  status: HomeWidgetStatus;
  url: string;
  title: string;
  message: string;
  activityState: ScannerActivityState;
  headline: string;
  activeScanners: string[];
  moreScannersAfterFirst: string;
  moreScannersAfterList: string;
  scansToday: string;
  lastScan: string;
  updated: string;
}

export interface ScannerActivityTimelineEntry {
  date: Date;
  props: ScannerActivityWidgetProps;
}

export interface ScannerActivityTimelineOptions {
  t: TFunction;
  locale: string;
  title: string;
  locks: Record<string, ScanLockInfo>;
  collectionNames: Map<string, string>;
  overview: OrgOverview;
  now: number;
}

export interface HomeWidgetSnapshots {
  collectionValue: CollectionValueWidgetProps;
  notifications: NotificationsWidgetProps;
  scannerActivity: ScannerActivityTimelineEntry[];
}
