export const SERVO_PULSE_MIN = 120;
export const SERVO_PULSE_MAX = 490;
export const SERVO_PULSE_CENTER = (SERVO_PULSE_MIN + SERVO_PULSE_MAX) / 2;
export const SERVO_POSITION_KEYS = [
  "bottomClosed",
  "bottomOpen",
  "paddleClosed",
  "paddleOpen",
  "pusherLeft",
  "pusherNeutral",
  "pusherRight",
] as const;
