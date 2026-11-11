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

export interface HomeWidgetSnapshots {
  collectionValue: CollectionValueWidgetProps;
  notifications: NotificationsWidgetProps;
}
