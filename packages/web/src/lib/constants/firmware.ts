export const LATEST_FIRMWARE_VERSION =
  import.meta.env.VITE_LATEST_FIRMWARE_VERSION ?? "1.0.1";

export const ESP32_FIRMWARE_CHIP = "ESP32-S3";
export const ESP32_FLASH_BAUD_RATE = 115200;

export const SERIAL_FED_EVENT = "fed";
export const SERIAL_JAM_ERROR = "jam";
export const SERIAL_BUSY_ERROR = "busy";
