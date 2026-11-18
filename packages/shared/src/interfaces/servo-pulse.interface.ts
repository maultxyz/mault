import type { SERVO_POSITION_KEYS } from "../constants/servo-pulse.constant";

export interface DirectionalSpeed {
  direction: "forward" | "reverse";
  magnitude: number;
}

export type ServoPositionKey = (typeof SERVO_POSITION_KEYS)[number];
