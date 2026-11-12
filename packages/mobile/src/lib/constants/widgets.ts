import type { CollectionValueWidgetProps, NotificationsWidgetProps } from "@/lib/interfaces/widgets";

export const COLLECTION_VALUE_WIDGET_NAME = "CollectionValue";

export const NOTIFICATIONS_WIDGET_NAME = "Notifications";

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
