import type { PlayingCard } from "./card.interface";

export interface OrgOverviewCard {
  scanId: string;
  collectionGuid: string;
  collectionName: string;
  card: PlayingCard;
  isFoil: boolean;
  price: number | null;
  scannedAt: string;
}

export interface OrgOverviewDay {
  date: string;
  count: number;
}

export interface OrgOverview {
  collectionCount: number;
  cardCount: number;
  totalValue: number;
  scansToday: number;
  scansThisWeek: number;
  scansByDay: OrgOverviewDay[];
  collectionValues: Record<string, number>;
  topCards: OrgOverviewCard[];
  recentCards: OrgOverviewCard[];
}
