import type {
  CollectionValueWidgetProps,
  NotificationsWidgetProps,
  ScannerActivityWidgetProps,
} from "@/lib/interfaces/widgets";

export const COLLECTION_VALUE_WIDGET_NAME = "CollectionValue";

export const NOTIFICATIONS_WIDGET_NAME = "Notifications";

export const SCANNER_ACTIVITY_WIDGET_NAME = "ScannerActivity";

export const SCANNER_ACTIVITY_WIDGET_URL = "mault:///";

export const SCANNER_ACTIVITY_WIDGET_MAX_LISTED_SCANNERS = 3;

export const SCANNER_ACTIVITY_WIDGET_REFRESH_MS = 60_000;

export const OPEN_NOTIFICATIONS_LINK_PARAM = "openNotifications";

export const COLLECTION_VALUE_WIDGET_URL = "mault:///";

export const NOTIFICATIONS_WIDGET_URL = `mault:///?${OPEN_NOTIFICATIONS_LINK_PARAM}=1`;

export const EMPTY_COLLECTION_VALUE_WIDGET_PROPS: CollectionValueWidgetProps = {
  status: "empty",
  url: COLLECTION_VALUE_WIDGET_URL,
  title: "Mault",
  message: "",
  totalValue: "",
  cardCount: "",
  scansToday: "",
  scansThisWeek: "",
};

export const EMPTY_NOTIFICATIONS_WIDGET_PROPS: NotificationsWidgetProps = {
  status: "empty",
  url: NOTIFICATIONS_WIDGET_URL,
  title: "Mault",
  message: "",
  count: 0,
  countLabel: "",
  summary: "",
  latestMessage: "",
};

export const EMPTY_SCANNER_ACTIVITY_WIDGET_PROPS: ScannerActivityWidgetProps = {
  status: "empty",
  url: SCANNER_ACTIVITY_WIDGET_URL,
  title: "Mault",
  message: "",
  activityState: "idle",
  headline: "",
  activeScanners: [],
  moreScannersAfterFirst: "",
  moreScannersAfterList: "",
  scansToday: "",
  lastScan: "",
  updated: "",
};
