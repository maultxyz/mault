import type { ServoConfig } from "@/lib/interfaces/calibration";

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

export function sliderMax(value: number, defaultMax: number): number {
  return Math.max(defaultMax, value);
}

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD = 90;

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT = Math.round(
  (PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD /
    (SERVO_PULSE_MAX - SERVO_PULSE_MIN)) *
    100,
);

export const SERVOS: ServoConfig[] = [
  {
    name: "bottom",
    labelKey: "servos.bottom.label",
    controlPositions: ["open"],
    calibrationPositions: [
      { labelKey: "servos.bottom.closed", key: "bottomClosed" },
      { labelKey: "servos.bottom.open", key: "bottomOpen" },
    ],
  },
  {
    name: "paddle",
    labelKey: "servos.paddle.label",
    controlPositions: ["open"],
    calibrationPositions: [
      { labelKey: "servos.paddle.closed", key: "paddleClosed" },
      { labelKey: "servos.paddle.open", key: "paddleOpen" },
    ],
  },
  {
    name: "pusher",
    labelKey: "servos.pusher.label",
    controlPositions: ["left", "neutral", "right"],
    calibrationPositions: [
      { labelKey: "servos.pusher.left", key: "pusherLeft" },
      { labelKey: "servos.pusher.neutral", key: "pusherNeutral" },
      { labelKey: "servos.pusher.right", key: "pusherRight" },
    ],
  },
];
