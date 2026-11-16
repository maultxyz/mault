import type {
  ServoCalibration,
  ServoName,
} from "./interfaces/module-configs.interface";

export function getCalibrationKey(
  servo: ServoName,
  position: string,
): keyof ServoCalibration | null {
  if (servo === "bottom")
    return position === "open" ? "bottomOpen" : "bottomClosed";
  if (servo === "paddle")
    return position === "open" ? "paddleOpen" : "paddleClosed";
  if (servo === "pusher") {
    if (position === "left") return "pusherLeft";
    if (position === "right") return "pusherRight";
    return "pusherNeutral";
  }
  return null;
}
