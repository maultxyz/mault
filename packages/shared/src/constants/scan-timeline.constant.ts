export const SCAN_TIMELINE_GROUPINGS = ["day", "hour"] as const;

export const SCAN_TIMELINE_PAGE_SIZE = 100;

export const SCAN_TIMELINE_FALLBACK_TIME_ZONE = "UTC";

export const SCAN_TIMELINE_DAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const SCAN_TIMELINE_HOUR_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
};
