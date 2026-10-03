import type {
  BinHeightPreset,
  DeviceToggleKey,
  ModuleDelayField,
  ServoConfig,
  SetupIntroPart,
  SetupIrSeen,
  SetupServoPosition,
} from "@/lib/interfaces/calibration";
import {
  IconArrowBarToDown,
  IconArrowsHorizontal,
  IconColumns2,
  IconRotateClockwise,
  IconStack2,
  type Icon,
} from "@tabler/icons-react";

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

export interface DirectionalSpeed {
  direction: "forward" | "reverse";
  magnitude: number;
}

export function pulseToDirectionalSpeed(pulse: number): DirectionalSpeed {
  if (pulse <= SERVO_PULSE_CENTER) {
    return {
      direction: "forward",
      magnitude: Math.round(
        ((SERVO_PULSE_CENTER - pulse) /
          (SERVO_PULSE_CENTER - SERVO_PULSE_MIN)) *
          100,
      ),
    };
  }
  return {
    direction: "reverse",
    magnitude: Math.round(
      ((pulse - SERVO_PULSE_CENTER) / (SERVO_PULSE_MAX - SERVO_PULSE_CENTER)) *
        100,
    ),
  };
}

export function directionalSpeedToPulse(speed: DirectionalSpeed): number {
  if (speed.direction === "forward") {
    return Math.round(
      SERVO_PULSE_CENTER -
        (speed.magnitude / 100) * (SERVO_PULSE_CENTER - SERVO_PULSE_MIN),
    );
  }
  return Math.round(
    SERVO_PULSE_CENTER +
      (speed.magnitude / 100) * (SERVO_PULSE_MAX - SERVO_PULSE_CENTER),
  );
}

export function pulseToSignedPercent(pulse: number): number {
  const { direction, magnitude } = pulseToDirectionalSpeed(pulse);
  return direction === "forward" ? magnitude : -magnitude;
}

export function signedPercentToPulse(signedPercent: number): number {
  return directionalSpeedToPulse(
    signedPercent >= 0
      ? { direction: "forward", magnitude: signedPercent }
      : { direction: "reverse", magnitude: -signedPercent },
  );
}

export const FEEDER_DURATION_SLIDER_MAX = 10_000;
export const FEEDER_PULSE_DURATION_SLIDER_MAX = 500;
export const FEEDER_PAUSE_DURATION_SLIDER_MAX = 1_000;
export const FEEDER_SETTLE_DURATION_SLIDER_MAX = 2_000;
export const FEEDER_REVERSE_DURATION_SLIDER_MAX = 1_000;
export const PADDLE_CLOSE_DELAY_SLIDER_MAX = 1_000;
export const PUSHER_HOLD_DURATION_SLIDER_MAX = 1_000;

export const MODULE_DELAY_FIELDS: ModuleDelayField[] = [
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
};
export const CAPTURE_SETTLE_DELAY_SLIDER_MAX = 2_000;
export const MATCHES_NEEDED_MIN = 1;
export const MATCHES_NEEDED_SLIDER_MAX = 5;

export function sliderMax(value: number, defaultMax: number): number {
  return Math.max(defaultMax, value);
}

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT = 12;

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

export const BIN_HEIGHT_PRESETS: BinHeightPreset[] = [
  { key: "small", height: 69 },
  { key: "medium", height: 113 },
  { key: "large", height: 187 },
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
