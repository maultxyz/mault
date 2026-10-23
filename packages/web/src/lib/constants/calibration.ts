import type {
  DeviceToggleKey,
  ModuleDelayField,
  ServoConfig,
  SetupIntroPart,
  SetupIrSeen,
  SetupServoPosition,
  Device,
  CalibrationSection,
  DirectionalSpeed,
} from "@/lib/interfaces/calibration";
import {
  IconAdjustmentsHorizontal,
  IconArrowBarToDown,
  IconArrowsHorizontal,
  IconChecklist,
  IconColumns2,
  IconFocus2,
  IconLayoutBoardSplit,
  IconPlugConnected,
  IconRotateClockwise,
  IconStack2,
  type Icon,
} from "@tabler/icons-react";
import {
  type FeederCalibration,
  type FirmwareFeature,
  type ServoCalibration,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
} from "@magic-vault/shared";

export const SERVO_CALIBRATION_FIELDS: (keyof ServoCalibration)[] = [
  "bottomClosed",
  "bottomOpen",
  "paddleClosed",
  "paddleOpen",
  "pusherLeft",
  "pusherNeutral",
  "pusherRight",
  "pusherHoldDuration",
  "paddleCloseDelay",
  "paddleOpenDelay",
];

export const STORED_SERVO_CALIBRATION_OPTIONAL_FIELDS: (keyof ServoCalibration)[] =
  ["paddleOpenDelay"];

export const FEEDER_CALIBRATION_FIELDS: (keyof FeederCalibration)[] = [
  "speed",
  "duration",
  "pulseDuration",
  "pauseDuration",
  "settleDuration",
  "reverseSpeed",
  "reverseDuration",
];

export const SERVO_PULSE_MIN = 120;
export const SERVO_PULSE_MAX = 490;

export function pulseToPercent(pulse: number): number {
  return Math.round(
    ((pulse - SERVO_PULSE_MIN) / (SERVO_PULSE_MAX - SERVO_PULSE_MIN)) * 100,
  );
}

export function percentToPulse(percent: number): number {
  return Math.round(
    SERVO_PULSE_MIN + (percent / 100) * (SERVO_PULSE_MAX - SERVO_PULSE_MIN),
  );
}

export const SERVO_PULSE_CENTER = (SERVO_PULSE_MIN + SERVO_PULSE_MAX) / 2;

export const FEEDER_STOP_PULSE_SLIDER_RANGE = 50;

export const FEEDER_STOP_GUIDE_STEPS = [
  "zero",
  "stops",
  "starts",
  "middle",
] as const;

export function pulseToDirectionalSpeed(
  pulse: number,
  center: number = SERVO_PULSE_CENTER,
): DirectionalSpeed {
  if (pulse <= center) {
    return {
      direction: "forward",
      magnitude: Math.round(
        ((center - pulse) / (center - SERVO_PULSE_MIN)) * 100,
      ),
    };
  }
  return {
    direction: "reverse",
    magnitude: Math.round(
      ((pulse - center) / (SERVO_PULSE_MAX - center)) * 100,
    ),
  };
}

export function recenterSpeedPulse(
  pulse: number,
  fromCenter: number,
  toCenter: number,
): number {
  if (pulse <= fromCenter) {
    const ratio = (fromCenter - pulse) / (fromCenter - SERVO_PULSE_MIN);
    return Math.round(toCenter - ratio * (toCenter - SERVO_PULSE_MIN));
  }
  const ratio = (pulse - fromCenter) / (SERVO_PULSE_MAX - fromCenter);
  return Math.round(toCenter + ratio * (SERVO_PULSE_MAX - toCenter));
}

export function directionalSpeedToPulse(
  speed: DirectionalSpeed,
  center: number = SERVO_PULSE_CENTER,
): number {
  if (speed.direction === "forward") {
    return Math.round(
      center - (speed.magnitude / 100) * (center - SERVO_PULSE_MIN),
    );
  }
  return Math.round(
    center + (speed.magnitude / 100) * (SERVO_PULSE_MAX - center),
  );
}

export function pulseToSignedPercent(
  pulse: number,
  center: number = SERVO_PULSE_CENTER,
): number {
  const { direction, magnitude } = pulseToDirectionalSpeed(pulse, center);
  return direction === "forward" ? magnitude : -magnitude;
}

export function signedPercentToPulse(
  signedPercent: number,
  center: number = SERVO_PULSE_CENTER,
): number {
  return directionalSpeedToPulse(
    signedPercent >= 0
      ? { direction: "forward", magnitude: signedPercent }
      : { direction: "reverse", magnitude: -signedPercent },
    center,
  );
}

export const FEEDER_DURATION_SLIDER_MAX = 10_000;
export const FEEDER_PULSE_DURATION_SLIDER_MAX = 500;
export const FEEDER_PAUSE_DURATION_SLIDER_MAX = 1_000;
export const FEEDER_SETTLE_DURATION_SLIDER_MAX = 2_000;
export const FEEDER_REVERSE_DURATION_SLIDER_MAX = 1_000;
export const PADDLE_CLOSE_DELAY_SLIDER_MAX = 1_000;
export const PADDLE_OPEN_DELAY_SLIDER_MAX = 1_000;
export const PUSHER_HOLD_DURATION_SLIDER_MAX = 1_000;

export const MODULE_DELAY_FIELDS: ModuleDelayField[] = [
  "paddleOpenDelay",
  "pusherHoldDuration",
  "paddleCloseDelay",
];

export const PUSH_TEST_DIRECTIONS = ["left", "right"] as const;

export const BIN_SLOTS_PHYSICAL_ORDER = [
  { direction: "right", labelKey: "binConfigurations.moduleLeft" },
  { direction: "left", labelKey: "binConfigurations.moduleRight" },
] as const;

export const MODULE_DELAY_SLIDER_MAX: Record<ModuleDelayField, number> = {
  pusherHoldDuration: PUSHER_HOLD_DURATION_SLIDER_MAX,
  paddleCloseDelay: PADDLE_CLOSE_DELAY_SLIDER_MAX,
  paddleOpenDelay: PADDLE_OPEN_DELAY_SLIDER_MAX,
};

export const MODULE_DELAY_FIRMWARE_FEATURES: Partial<
  Record<ModuleDelayField, FirmwareFeature>
> = {
  paddleOpenDelay: "paddleOpenDelay",
};
export const CAPTURE_SETTLE_DELAY_SLIDER_MAX = 2_000;
export const MATCHES_NEEDED_MIN = 1;
export const MATCHES_NEEDED_SLIDER_MAX = 5;

export function sliderMax(value: number, defaultMax: number): number {
  return Math.max(defaultMax, value);
}

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT = 16;

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD = Math.round(
  (PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT / 100) *
    (SERVO_PULSE_MAX - SERVO_PULSE_MIN),
);

export const PUSHER_SUGGESTED_OFFSET_PERCENT = { min: 10, max: 12 };

export const SERVOS: ServoConfig[] = [
  {
    name: "bottom",
    labelKey: "servos.bottom.label",
    positions: ["closed", "open"],
  },
  {
    name: "paddle",
    labelKey: "servos.paddle.label",
    positions: ["closed", "open"],
  },
  {
    name: "pusher",
    labelKey: "servos.pusher.label",
    positions: ["left", "neutral", "right"],
  },
];

export const SETUP_SERVO_POSITIONS: SetupServoPosition[] = [
  { servo: "bottom", position: "closed", calKey: "bottomClosed", restKey: "bottomClosed" },
  { servo: "bottom", position: "open", calKey: "bottomOpen", restKey: "bottomClosed" },
  { servo: "paddle", position: "closed", calKey: "paddleClosed", restKey: "paddleClosed" },
  { servo: "paddle", position: "open", calKey: "paddleOpen", restKey: "paddleClosed" },
  { servo: "pusher", position: "neutral", calKey: "pusherNeutral", restKey: "pusherNeutral" },
  { servo: "pusher", position: "left", calKey: "pusherLeft", restKey: "pusherNeutral" },
  { servo: "pusher", position: "right", calKey: "pusherRight", restKey: "pusherNeutral" },
];

export function emptySetupIrSeen(): SetupIrSeen {
  return { modules: new Set(), hopper: false };
}

export const SETUP_INTRO_PARTS: { key: SetupIntroPart; icon: Icon }[] = [
  { key: "feeder", icon: IconRotateClockwise },
  { key: "module", icon: IconStack2 },
  { key: "bottom", icon: IconArrowBarToDown },
  { key: "paddle", icon: IconColumns2 },
  { key: "pusher", icon: IconArrowsHorizontal },
];

export const DEVICE_TOGGLE_KEYS: DeviceToggleKey[] = [
  "autoConnect",
  "testOnConnect",
  "pipelinedFeed",
];

export const DEFAULT_DEVICE: Device = {
  guid: "",
  name: "Card Sorter",
  hardwareId: null,
  scanRegion: DEFAULT_SCAN_REGION,
  captureSettleDelayMs: DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  matchesNeeded: DEFAULT_MATCHES_NEEDED,
  feederStopPulse: null,
  checkBothOrientations: DEFAULT_CHECK_BOTH_ORIENTATIONS,
  flipCamera: false,
  moduleCount: DEFAULT_MODULE_COUNT,
  channelLayout: DEFAULT_CHANNEL_LAYOUT,
  setupCompletedAt: null,
  pipelinedFeed: false,
  autoConnect: false,
  testOnConnect: true,
  createdAt: "",
  updatedAt: "",
};

export const CALIBRATE_PATH = "/app/calibrate";

export const CALIBRATION_SECTION_PATHS: Record<CalibrationSection, string> = {
  connection: "connection",
  layout: "layout",
  calibration: "calibration",
  scanRegion: "scan-region",
  test: "test",
};

export const CALIBRATION_PATH_SECTIONS: Record<string, CalibrationSection> = {
  connection: "connection",
  layout: "layout",
  calibration: "calibration",
  "scan-region": "scanRegion",
  test: "test",
};

export const DEFAULT_CALIBRATION_SECTION: CalibrationSection = "connection";

export const CALIBRATION_SECTIONS = [
  { section: "connection", icon: IconPlugConnected },
  { section: "layout", icon: IconLayoutBoardSplit },
  { section: "calibration", icon: IconAdjustmentsHorizontal },
  { section: "scanRegion", icon: IconFocus2 },
  { section: "test", icon: IconChecklist },
] as const satisfies readonly {
  section: CalibrationSection;
  icon: Icon;
}[];

export const CALIBRATION_LIVE_DETECTION_INTERVAL_MS = 200;
