import type { QueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import type { OrgOverview, WidgetScanActivity, WidgetSummary } from "@magic-vault/shared";
import type { ScanLockInfo } from "@/lib/interfaces/stream";

export type HomeWidgetStatus = "empty" | "signed-out" | "ready";

export interface WidgetLogo {
  light: string;
  dark: string;
}

export interface CollectionWidgetConfiguration {
  collection?: string | null;
}

export type WidgetValueChangeDirection = "up" | "down" | "flat" | "none";

export interface CollectionValueWidgetScope {
  title: string;
  badge: string;
  chartValues: number[];
  url: string;
  totalValue: string;
  previousValue: string;
  changeDirection: WidgetValueChangeDirection;
  change: string;
  changePercent: string;
  cardCount: string;
  previousCardCount: string;
  accessibilityText: string;
}

export interface CollectionValueWidgetProps {
  status: HomeWidgetStatus;
  logo: WidgetLogo;
  url: string;
  title: string;
  message: string;
  updated: string;
  cardsLabel: string;
  changeLabel: string;
  scopes: Record<string, CollectionValueWidgetScope>;
}

export interface TotalCardsWidgetScope {
  title: string;
  url: string;
  digits: string;
  accessibilityText: string;
}

export interface TotalCardsWidgetProps {
  status: HomeWidgetStatus;
  logo: WidgetLogo;
  url: string;
  title: string;
  message: string;
  updated: string;
  caption: string;
  scopes: Record<string, TotalCardsWidgetScope>;
}

export interface WidgetCard {
  scanId: string;
  collectionGuid: string;
  name: string;
  detail: string;
  price: string;
  imageUri: string;
  url: string;
  accessibilityText: string;
}

export interface WidgetCardListScope {
  title: string;
  url: string;
  cards: WidgetCard[];
}

export interface WidgetCardListProps {
  status: HomeWidgetStatus;
  url: string;
  logo: WidgetLogo;
  title: string;
  message: string;
  emptyMessage: string;
  scopes: Record<string, WidgetCardListScope>;
}

export interface CardReviewWidgetProps {
  status: HomeWidgetStatus;
  logo: WidgetLogo;
  url: string;
  title: string;
  message: string;
  needsReviewCount: number;
  cards: WidgetCard[];
  queue: string[];
  acceptedScanIds: string[];
  countCaption: string;
  acceptLabel: string;
  laterLabel: string;
  doneTitle: string;
  doneMessage: string;
  moreInAppMessage: string;
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
  activeScannerProgress: string[];
  alert: string;
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
  scanActivity: WidgetScanActivity[];
  latestDeviceAlert: WidgetSummary["latestDeviceAlert"];
  now: number;
}

export interface WidgetCollectionOption {
  name: string;
  value: string;
}

export interface WidgetCollectionOptions {
  collectionValue: WidgetCollectionOption[];
  other: WidgetCollectionOption[];
}

export interface HomeWidgetSnapshots {
  collectionValue?: CollectionValueWidgetProps;
  totalCards?: TotalCardsWidgetProps;
  topCards?: WidgetCardListProps;
  cardOfTheDay?: WidgetCardListProps;
  notifications: NotificationsWidgetProps;
  scannerActivity: ScannerActivityTimelineEntry[];
  collectionOptions: WidgetCollectionOptions;
}

export interface WidgetSummaryPropsOptions {
  t: TFunction;
  locale: string;
  formatPrice: (value: number) => string;
  summary: WidgetSummary;
  cardImageUris: Map<string, string>;
  logo: WidgetLogo;
  pendingAcceptedScanIds: ReadonlySet<string>;
  now: number;
}

export interface PendingReviewAccept {
  collectionGuid: string;
  sentAt: number | null;
}

export interface CardReviewWidgetSyncOptions {
  queryClient: QueryClient;
  summaryUpdatedAt: number;
  buildProps: (pendingAcceptedScanIds: ReadonlySet<string>) => CardReviewWidgetProps;
}
