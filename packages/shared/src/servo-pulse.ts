import {
  SERVO_PULSE_CENTER,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
} from "./constants/servo-pulse.constant";
import type { DirectionalSpeed } from "./interfaces/servo-pulse.interface";

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
