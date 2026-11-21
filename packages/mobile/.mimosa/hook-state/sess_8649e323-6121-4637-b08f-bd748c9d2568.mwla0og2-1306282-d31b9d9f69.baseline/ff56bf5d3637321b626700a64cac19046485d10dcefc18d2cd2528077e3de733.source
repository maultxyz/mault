import { type FirmwareFeature, SERVO_PULSE_MAX, SERVO_PULSE_MIN } from "@magic-vault/shared";
import type {
  CalibrationSectionLink,
  DeviceToggleKey,
  ModuleDelayField,
  ServoConfig,
  SetupServoPosition,
} from "@/lib/interfaces/calibration";

export const DEFAULT_SLIDER_PULSE = 307;

export function sliderMax(value: number, defaultMax: number): number {
  return Math.max(defaultMax, value);
}

export const SERVOS: ServoConfig[] = [
  { name: "bottom", positions: ["closed", "open"] },
  { name: "paddle", positions: ["closed", "open"] },
  { name: "pusher", positions: ["left", "neutral", "right"] },
];

export const SETUP_SERVO_POSITIONS: SetupServoPosition[] = [
  { servo: "bottom", position: "closed", calKey: "bottomClosed" },
  { servo: "bottom", position: "open", calKey: "bottomOpen" },
  { servo: "paddle", position: "closed", calKey: "paddleClosed" },
  { servo: "paddle", position: "open", calKey: "paddleOpen" },
  { servo: "pusher", position: "neutral", calKey: "pusherNeutral" },
  { servo: "pusher", position: "left", calKey: "pusherLeft" },
  { servo: "pusher", position: "right", calKey: "pusherRight" },
];

export const MODULE_DELAY_FIELDS: ModuleDelayField[] = ["paddleOpenDelay", "pusherHoldDuration", "paddleCloseDelay"];

export const MODULE_DELAY_SLIDER_MAX: Record<ModuleDelayField, number> = {
  paddleOpenDelay: 1_000,
  pusherHoldDuration: 1_000,
  paddleCloseDelay: 1_000,
};

export const MODULE_DELAY_FIRMWARE_FEATURES: Partial<Record<ModuleDelayField, FirmwareFeature>> = {
  paddleOpenDelay: "paddleOpenDelay",
};

export const PUSH_TEST_DIRECTIONS = ["left", "right"] as const;

export const FEEDER_DURATION_SLIDER_MAX = 10_000;
export const FEEDER_PULSE_DURATION_SLIDER_MAX = 500;
export const FEEDER_PAUSE_DURATION_SLIDER_MAX = 1_000;
export const FEEDER_SETTLE_DURATION_SLIDER_MAX = 2_000;
export const FEEDER_REVERSE_DURATION_SLIDER_MAX = 1_000;

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT = 16;
export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD = Math.round(
  (PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT / 100) * (SERVO_PULSE_MAX - SERVO_PULSE_MIN),
);

export const CALIBRATION_PREVIEW_DEBOUNCE_MS = 150;
export const SERVO_TEST_GATE_HOLD_MS = 600;
export const SERVO_TEST_PUSHER_HOLD_MS = 1000;
export const FEEDER_PREVIEW_STOP_MS = 3000;

export const CALIBRATION_SECTION_LINKS: CalibrationSectionLink[] = [
  { path: "/calibrate/servos", titleKey: "calibration.sections.servos.title", descriptionKey: "calibration.sections.servos.description", icon: "adjust" },
  { path: "/calibrate/layout", titleKey: "calibration.sections.layout.title", descriptionKey: "calibration.sections.layout.description", icon: "layout" },
  { path: "/calibrate/scan-region", titleKey: "calibration.sections.scanRegion.title", descriptionKey: "calibration.sections.scanRegion.description", icon: "camera" },
  { path: "/calibrate/connection", titleKey: "calibration.sections.connection.title", descriptionKey: "calibration.sections.connection.description", icon: "connection" },
  { path: "/calibrate/test", titleKey: "calibration.sections.test.title", descriptionKey: "calibration.sections.test.description", icon: "test" },
];

export const BIN_SLOTS_PHYSICAL_ORDER = [
  { direction: "right", labelKey: "calibration.bins.moduleLeft" },
  { direction: "left", labelKey: "calibration.bins.moduleRight" },
] as const;

export const CAPTURE_SETTLE_DELAY_SLIDER_MAX = 2_000;
export const MATCHES_NEEDED_MIN = 1;
export const MATCHES_NEEDED_SLIDER_MAX = 5;
export const SCAN_REGION_COVERAGE_MIN = 0.1;
export const SCAN_REGION_OFFSET_LIMIT = 0.45;

export const DEVICE_TOGGLE_KEYS: DeviceToggleKey[] = ["autoConnect", "testOnConnect", "pipelinedFeed"];
export const CALIBRATION_STEP_SETTLE_MS = 500;
export const IR_MONITOR_INTERVAL_MS = 300;
export const IR_READ_TIMEOUT_MS = 2000;
