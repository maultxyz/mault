import type {
  CardReviewWidgetProps,
  CollectionValueWidgetProps,
  NotificationsWidgetProps,
  ScannerActivityWidgetProps,
  TotalCardsWidgetProps,
  WidgetCardListProps,
  WidgetLogo,
} from "@/lib/interfaces/widgets";

export const COLLECTION_VALUE_WIDGET_NAME = "CollectionValue";

export const TOTAL_CARDS_WIDGET_NAME = "TotalCards";

export const TOP_CARDS_WIDGET_NAME = "TopCards";

export const CARD_OF_THE_DAY_WIDGET_NAME = "CardOfTheDay";

export const CARD_REVIEW_WIDGET_NAME = "CardReview";

export const COLLECTION_WIDGET_NAMES = [
  COLLECTION_VALUE_WIDGET_NAME,
  TOTAL_CARDS_WIDGET_NAME,
  TOP_CARDS_WIDGET_NAME,
  CARD_OF_THE_DAY_WIDGET_NAME,
] as const;

export const WIDGET_COLLECTION_PARAMETER = "collection";

export const WIDGET_ALL_COLLECTIONS_SCOPE = "all";
export const WIDGET_TOP_COLLECTION_SCOPE = "top";
export const WIDGET_CHART_BASELINE = 0.25;

export const WIDGET_CARD_IMAGES_DIRECTORY = "card-images";
export const WIDGET_LOGO_DIRECTORY = "brand";
export const EMPTY_WIDGET_LOGO: WidgetLogo = { light: "", dark: "" };

export const TOTAL_CARDS_WIDGET_MIN_DIGITS = 5;

export const WIDGET_ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const WIDGET_VALUE_CHANGE_EPSILON = 0.005;

export const WIDGET_SUMMARY_QUERY_KEY = "widget-summary";

export const WIDGET_SUMMARY_REFRESH_MS = 60_000;

export const WIDGET_SUMMARY_IDLE_STALE_MS = 5 * 60_000;

export const NOTIFICATIONS_WIDGET_NAME = "Notifications";

export const SCANNER_ACTIVITY_WIDGET_NAME = "ScannerActivity";

export const SCANNER_ACTIVITY_WIDGET_URL = "mault:///";

export const SCANNER_ACTIVITY_WIDGET_MAX_LISTED_SCANNERS = 3;

export const SCANNER_ACTIVITY_WIDGET_REFRESH_MS = 60_000;

export const OPEN_NOTIFICATIONS_LINK_PARAM = "openNotifications";

export const COLLECTION_VALUE_WIDGET_URL = "mault:///";

export const NOTIFICATIONS_WIDGET_URL = `mault:///?${OPEN_NOTIFICATIONS_LINK_PARAM}=1`;

export const REVIEW_WIDGET_URL = "mault:///";

export const EMPTY_COLLECTION_VALUE_WIDGET_PROPS: CollectionValueWidgetProps = {
  status: "empty",
  logo: EMPTY_WIDGET_LOGO,
  url: COLLECTION_VALUE_WIDGET_URL,
  title: "Mault",
  message: "",
  updated: "",
  cardsLabel: "",
  changeLabel: "",
  scopes: {},
};

export const EMPTY_TOTAL_CARDS_WIDGET_PROPS: TotalCardsWidgetProps = {
  status: "empty",
  logo: EMPTY_WIDGET_LOGO,
  url: COLLECTION_VALUE_WIDGET_URL,
  title: "Mault",
  message: "",
  updated: "",
  caption: "",
  scopes: {},
};

export const EMPTY_CARD_LIST_WIDGET_PROPS: WidgetCardListProps = {
  status: "empty",
  logo: EMPTY_WIDGET_LOGO,
  url: COLLECTION_VALUE_WIDGET_URL,
  title: "Mault",
  message: "",
  emptyMessage: "",
  scopes: {},
};

export const EMPTY_CARD_REVIEW_WIDGET_PROPS: CardReviewWidgetProps = {
  status: "empty",
  logo: EMPTY_WIDGET_LOGO,
  url: REVIEW_WIDGET_URL,
  title: "Mault",
  message: "",
  needsReviewCount: 0,
  cards: [],
  queue: [],
  acceptedScanIds: [],
  countCaption: "",
  acceptLabel: "",
  laterLabel: "",
  doneTitle: "",
  doneMessage: "",
  moreInAppMessage: "",
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
  activeScannerProgress: [],
  alert: "",
  moreScannersAfterFirst: "",
  moreScannersAfterList: "",
  scansToday: "",
  lastScan: "",
  updated: "",
};
