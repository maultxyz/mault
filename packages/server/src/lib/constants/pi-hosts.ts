import type { OrgRole } from "@magic-vault/shared";

export const PI_HOST_TOKEN_PREFIX = "mvpi_";
export const PI_HOST_TOKEN_BYTES = 32;
export const PI_LINK_POLL_SECRET_BYTES = 24;

export const PI_LINK_PAIRING_TTL_MS = 15 * 60_000;
export const PI_LINK_PAIRING_RETENTION_MS = 24 * 60 * 60_000;
export const PI_LINK_PAIRING_CODE_ATTEMPTS = 5;

export const PI_LINK_PAIRING_CREATE_RATE_LIMIT_REQUESTS = 30;
export const PI_LINK_PAIRING_CREATE_RATE_LIMIT_WINDOW_MS = 60_000;
export const PI_LINK_PAIRING_CREATE_RATE_LIMIT_KEY = "pi-link-pairing-create";
export const PI_LINK_PAIRING_POLL_RATE_LIMIT_REQUESTS = 60;
export const PI_LINK_PAIRING_POLL_RATE_LIMIT_WINDOW_MS = 60_000;
export const PI_LINK_RATE_LIMIT_SWEEP_SIZE = 10_000;

export const PI_HOST_LOOKUP_CACHE_TTL_MS = 10_000;
export const PI_HOST_LOOKUP_CACHE_MAX_ENTRIES = 1_000;
export const PI_HOST_LAST_SEEN_WRITE_INTERVAL_MS = 5 * 60_000;

export const PI_HOST_MANAGER_ROLES: OrgRole[] = ["owner", "admin"];
export const PI_HOST_MANAGERS_ONLY_MESSAGE =
  "Only owners and admins can link or remove a Raspberry Pi.";
export const PI_LINK_PAIRING_NOT_FOUND_MESSAGE =
  "That code was not found or has expired. Check the code on the Pi.";
export const PI_LINK_RATE_LIMITED_MESSAGE =
  "Too many pairing requests. Try again in a minute.";

export const PI_LINK_COMMAND_TIMEOUT_MS = 120_000;
export const PI_LINK_MAX_MESSAGE_BYTES = 1024 * 1024;
export const PI_LINK_CLOSE_REPLACED = 4000;
export const PI_LINK_CLOSE_REVOKED = 4001;
export const PI_LINK_OFFLINE_MESSAGE = "The Pi is offline. Check that it is powered on and connected.";
export const PI_LINK_TIMEOUT_MESSAGE = "The Pi did not answer in time.";
export const PI_LINK_SCAN_RUNNING_MESSAGE = "A scan is already running on this Pi.";

export const PI_LINK_DEVICE_RECONNECT_MIN_MS = 2_000;
export const PI_LINK_DEVICE_RECONNECT_MAX_MS = 60_000;
export const PI_LINK_DEVICE_STATE_INTERVAL_MS = 1_000;
export const PI_LINK_DEVICE_PAIRING_POLL_MS = 3_000;
export const PI_LINK_DEVICE_PAIRING_RETRY_MS = 30_000;
export const PI_LINK_DEVICE_CREDENTIAL_FILE = "pi-link.json";
export const PI_LINK_DEVICE_URL_ENV = "MAULT_LINK_URL";
export const PI_HOST_NOT_FOUND_MESSAGE = "Pi not found.";

export const PI_LINK_CAMERA_FRAME_INTERVAL_MS = 500;
export const PI_LINK_CAMERA_FRAME_WIDTH = 640;
export const PI_LINK_CAMERA_FRAME_QUALITY = 60;

export const PI_SORTER_BRIDGE_PATH = "/sorter-link";
export const PI_SORTER_HARDWARE_ID_PATTERN = /^[A-Z0-9:_-]{1,64}$/;
export const PI_SORTER_BRIDGE_IDLE_MS = 60_000;
export const PI_SORTER_BRIDGE_RETRY_MS = 30_000;
export const PI_SORTER_BRIDGE_BUSY_ERROR = "busy";

export const PI_SORTER_BRIDGE_RATE_LIMIT_REQUESTS = 6;
export const PI_SORTER_BRIDGE_RATE_LIMIT_WINDOW_MS = 60_000;
export const PI_SORTER_BRIDGE_OTHER_SORTER_MESSAGE =
  "This Pi is linked with a different sorter. Remove the Pi in Mault and link it again to use this one.";
export const PI_HOST_CLAIM_RATE_LIMIT_REQUESTS = 10;
export const PI_HOST_CLAIM_RATE_LIMIT_WINDOW_MS = 10 * 60_000;
export const PI_HOST_START_IN_PROGRESS_MESSAGE = "Another member is starting a scan on this Pi.";
export const PI_CAMERA_VIEWER_MAX_MS = 10 * 60_000;
export const PI_CAMERA_MAX_BUFFERED_BYTES = 512 * 1024;
export const PI_LINK_CAMERA_SCANNING_FRAME_INTERVAL_MS = 1_500;
export const PI_HOST_OFFLINE_LOCK_RELEASE_MS = 10 * 60_000;
export const PI_SORTER_BRIDGE_RETRY_MAX_MS = 10 * 60_000;
export const PI_SORTER_BRIDGE_IDENTITY_ATTEMPTS = 3;
export const PI_LINK_LOCAL_HOST_PATTERN =
  /^(localhost|127\.[0-9.]+|10\.[0-9.]+|192\.168\.[0-9.]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9.]+|[a-z0-9-]+\.local)$/i;
