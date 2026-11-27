import { PI_LINK_LOCAL_STATUS_PATH } from "@magic-vault/shared";

export const RASPBERRY_PIS_QUERY_KEY = "pi-hosts";
export const RASPBERRY_PI_LINK_FORM_ID = "link-raspberry-pi-form";

export const RASPBERRY_PI_STATUS_BADGE_VARIANTS = {
  offline: "outline",
  idle: "secondary",
  running: "success",
  paused: "warning",
  stopping: "info",
  error: "destructive",
} as const;

export const RASPBERRY_PI_START_FORM_ID = "start-raspberry-pi-scan-form";
export const RASPBERRY_PI_RENAME_FORM_ID = "rename-raspberry-pi-form";
export const RASPBERRY_PI_FOIL_NONE_VALUE = "__auto__";

export const RASPBERRY_PI_LINK_CODE_PARAM = "linkCode";
export const PI_LINK_LOCAL_STATUS_API = `/api${PI_LINK_LOCAL_STATUS_PATH}`;
export const PI_LINK_SETUP_POLL_MS = 3000;
