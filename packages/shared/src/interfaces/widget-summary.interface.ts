import type { DeviceAlertType } from "./business.interface";
import type { OrgOverviewCard } from "./org-overview.interface";

export interface WidgetValueTrend {
  cardCount: number;
  totalValue: number;
  previousCardCount: number | null;
  previousValue: number | null;
  previousDay: string | null;
}

export interface WidgetCollectionSummary extends WidgetValueTrend {
  guid: string;
  name: string;
  topCards: OrgOverviewCard[];
  cardsOfTheDay: OrgOverviewCard[];
  valueHistory: WidgetValuePoint[];
}

export interface WidgetReviewSummary {
  needsReviewCount: number;
  cards: OrgOverviewCard[];
}

export interface WidgetScanActivity {
  collectionGuid: string;
  sessionScanCount: number;
  sessionStartedAt: string;
  lastScanAt: string;
  scansPerMinute: number;
}

export interface WidgetDeviceAlert {
  type: DeviceAlertType;
  title: string;
  createdAt: string;
}

export interface WidgetValuePoint {
  day: string;
  totalValue: number;
}

export interface WidgetSummary {
  all: WidgetValueTrend & { cardsOfTheDay: OrgOverviewCard[]; valueHistory: WidgetValuePoint[] };
  collections: WidgetCollectionSummary[];
  review: WidgetReviewSummary;
  scanActivity: WidgetScanActivity[];
  latestDeviceAlert: WidgetDeviceAlert | null;
  scansAllTime: number;
}
