export type NotificationTestOutcome = "sent" | "no_channel" | "failed";

export type NotificationTestType =
  | "sorter-error"
  | "feeder-empty"
  | "card-jam"
  | "card-search-error"
  | "sync-failure";
