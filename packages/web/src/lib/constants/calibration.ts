import type { ServoConfig } from "@/lib/interfaces/calibration";

export const PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD = 80;

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
    controlPositions: ["left", "right"],
    calibrationPositions: [
      { labelKey: "servos.pusher.left", key: "pusherLeft" },
      { labelKey: "servos.pusher.neutral", key: "pusherNeutral" },
      { labelKey: "servos.pusher.right", key: "pusherRight" },
    ],
  },
];
