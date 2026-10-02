import { SERVO_PULSE_MAX, SERVO_PULSE_MIN } from "@/lib/constants/calibration";

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

export const KIT_SPIN_FORWARD_PULSE = 250;
export const KIT_SPIN_REVERSE_PULSE = 370;

export const KIT_COMMAND_TIMEOUT_MS = 3_000;
export const KIT_SENSOR_POLL_MS = 400;
export const KIT_SERVO_HISTORY_LIMIT = 50;
