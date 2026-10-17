export const SORTER_LINK_DEVICE_PATH = "/sorter-link/device";
export const SORTER_LINK_CLIENT_PATH = "/sorter-link/client";

export const SORTER_LINK_READY_KEY = "sorterLink";
export const SORTER_LINK_READY_VALUE = "ready";

export const SORTER_LINK_CLOSE_OFFLINE = 4404;
export const SORTER_LINK_CLOSE_IN_USE = 4409;
export const SORTER_LINK_CLOSE_REPLACED = 4000;
export const SORTER_LINK_CLOSE_REVOKED = 4401;

export const SORTER_LINK_MAX_MESSAGE_BYTES = 1024;

export const WIFI_SSID_MAX_LENGTH = 32;
export const WIFI_PASSWORD_MIN_LENGTH = 8;
export const WIFI_PASSWORD_MAX_LENGTH = 64;
export const SORTER_LINK_URL_MAX_LENGTH = 150;

export const WIFI_LINK_STATES = [
  "unconfigured",
  "connecting",
  "connected",
  "paused",
] as const;
export const CLOUD_LINK_STATES = [
  "unconfigured",
  "offline",
  "connecting",
  "connected",
  "rejected",
] as const;
