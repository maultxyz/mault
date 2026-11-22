import {
  LED_CHANNELS,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
} from "@magic-vault/shared";

export const KIT_CHANNEL_COUNT = 16;
export const KIT_CHANNELS = Array.from(
  { length: KIT_CHANNEL_COUNT },
  (_, channel) => channel,
);

export const KIT_CENTER_PULSE = Math.round(
  (SERVO_PULSE_MIN + SERVO_PULSE_MAX) / 2,
);
export const KIT_SWEEP_PULSES = [
  SERVO_PULSE_MIN,
  SERVO_PULSE_MAX,
  KIT_CENTER_PULSE,
];
export const KIT_SWEEP_STEP_MS = 700;

export const KIT_COMMAND_TIMEOUT_MS = 3_000;
export const KIT_SERVO_HISTORY_LIMIT = 50;

export const RAW_COMMAND_TIMEOUT_MS = 15_000;
export const RAW_COMMAND_HISTORY_LIMIT = 30;
export const RAW_COMMAND_PRESETS = [
  { key: "servoPulse", command: { servo: "pusher", module: 1, value: 305 } },
  { key: "servoPosition", command: { servo: "bottom", module: 1, position: "open" } },
  { key: "channelPulse", command: { channel: 0, value: 305 } },
  { key: "channelRelease", command: { channelStop: 0 } },
  { key: "neutral", command: { neutral: true } },
  { key: "status", command: { getStatus: true } },
] as const;

export const KIT_LED_DEFAULT_SELECTION = { strip: 1, led: 1 } as const;
export const KIT_LED_REPLY_ENTRY_LENGTH = LED_CHANNELS.length + 2;
export const KIT_LED_SWATCH_MIN_OPACITY = 0.25;

export const KIT_STRESS_STEP_MS = 600;
export const KIT_STRESS_DEFAULT_CHANNELS = [0];
export const KIT_WATCH_PATCH_MAX_SIDE = 80;
export const KIT_WATCH_PATCH_MIN_SIDE = 4;
export const KIT_WATCH_FRAME_LAG_MS = 250;
export const KIT_WATCH_MIN_PATCH_CONTRAST = 4;
export const KIT_WATCH_CHANGED_PIXEL_MIN_DIFFERENCE = 0.6;
export const KIT_WATCH_MIN_CHANGED_PIXELS = 8;
export const KIT_WATCH_MIN_MOVEMENT_PERCENT = 35;
export const KIT_WATCH_REFERENCE_ADAPT_RATE = 0.2;
export const KIT_WATCH_MISSES_TO_STOP = 3;
export const KIT_WATCH_MIN_BOX_FRACTION = 0.03;
export const KIT_WATCH_DEFAULT_BOX_FRACTION = 0.2;
export const KIT_WATCH_BOX_STEP_FRACTION = 0.02;
export const KIT_WATCH_BOX_ADJUSTMENTS = [
  { key: "left" },
  { key: "right" },
  { key: "up" },
  { key: "down" },
  { key: "grow" },
  { key: "shrink" },
] as const;
export const KIT_WATCH_DEFAULT_ASPECT_RATIO = 16 / 9;
