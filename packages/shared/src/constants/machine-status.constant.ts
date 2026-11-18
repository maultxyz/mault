export const MACHINES_PATH = "/machines";

export const MACHINES_INIT_EVENT = "machines_init";
export const MACHINE_STATUS_EVENT = "machine_status";
export const MACHINE_REMOVED_EVENT = "machine_removed";
export const MACHINE_COMMAND_EVENT = "machine_command";
export const MACHINE_CAMERA_REQUESTED_EVENT = "machine_camera_requested";

export const MACHINE_RUN_STATES = [
  "running",
  "paused",
  "attention",
  "stopped",
  "idle",
] as const;

export const MACHINE_COMMANDS = ["pause", "resume", "emergencyStop"] as const;

export const MACHINE_ATTENTION_KINDS = [
  "jam",
  "hopperEmpty",
  "feederError",
  "noCardDetected",
  "cardStuckInModuleOne",
  "sorterNotResponding",
  "routingFailed",
  "binLimit",
  "binsFull",
  "packsComplete",
  "saveFailed",
  "scanLimit",
  "sorterLimit",
  "collectionLocked",
  "scannerError",
  "emergencyStopped",
] as const;

export const PI_HOST_MACHINE_ID = "pi-host";

export const MACHINE_STATUS_RUNNING_TTL_MS = 3 * 60 * 1000;
export const MACHINE_STATUS_IDLE_TTL_MS = 30 * 60 * 1000;
export const MACHINE_STATUS_HEARTBEAT_MS = 60 * 1000;
export const MACHINE_STATUS_STALE_AFTER_MS = 2 * 60 * 1000;
export const MACHINE_STATUS_PUBLISH_DEBOUNCE_MS = 500;
export const MACHINE_PI_HOST_POLL_MS = 1000;

export const MACHINE_CAMERA_LEASE_MS = 8000;
export const MACHINE_CAMERA_FRAME_INTERVAL_MS = 1500;
export const MACHINE_CAMERA_FRAME_STALE_MS = 4000;
export const MACHINE_CAMERA_FRAME_MAX_BYTES = 400 * 1024;
export const MACHINE_CAMERA_FRAME_MAX_WIDTH = 640;
export const MACHINE_CAMERA_FRAME_JPEG_QUALITY = 0.6;

export const MACHINE_NAME_MAX_LENGTH = 80;
export const MACHINE_BIN_FILL_MAX_BINS = 64;
export const MACHINE_ID_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

export const MACHINE_BIN_WARNING_PERCENT = 90;
