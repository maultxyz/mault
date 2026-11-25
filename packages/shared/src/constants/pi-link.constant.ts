export const PI_HOSTS_PATH = "/pi-hosts";
export const PI_LINK_DEVICE_PATH = "/pi-link/device";
export const PI_LINK_PUBLIC_PAIRINGS_PATH = "/public/pi-link/pairings";

export const PI_LINK_PAIRING_SECRET_HEADER = "X-Pi-Pairing-Secret";

export const PI_LINK_PAIRING_CODE_LENGTH = 8;
export const PI_LINK_PAIRING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PI_LINK_PAIRING_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export const PI_HOST_NAME_MAX_LENGTH = 60;
export const PI_HOST_DEFAULT_NAME = "Raspberry Pi";

export const PI_LINK_PAIRING_STATUSES = ["pending", "claimed", "expired"] as const;

export const PI_LINK_COMMANDS_SEGMENT = "/commands";
export const PI_LINK_LOCAL_STATUS_PATH = "/pi-link/local";

export const PI_LINK_SCAN_ACTIONS = [
  "state",
  "start",
  "pause",
  "resume",
  "stop",
  "emergencyStop",
  "feed",
  "settings",
  "resetStats",
  "removal",
] as const;

export const PI_HOST_STATUS_EVENT = "pi_host_status";
export const PI_HOST_SCAN_SESSION_SEGMENT = "/scan-session";
export const PI_HOST_CAMERA_SEGMENT = "/camera";
export const PI_HOST_CAMERA_CLOSE_REFRESH = 4002;
export const PI_HOST_CAMERA_RECONNECT_MIN_MS = 3_000;
export const PI_HOST_CAMERA_RECONNECT_MAX_MS = 60_000;
export const PI_HOST_CAMERA_MAX_FAILED_CONNECTS = 6;
