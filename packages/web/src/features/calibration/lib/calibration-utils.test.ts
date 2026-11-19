import { buildCalibrationDebugText } from "@/features/calibration/lib/calibration-utils";
import {
  DEFAULT_FEEDER_CALIBRATION,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  servoPositionPercents,
  type ServoCalibration,
} from "@magic-vault/shared";
import { describe, expect, it } from "vitest";

const SERVO: ServoCalibration = {
  bottomClosed: SERVO_PULSE_MIN,
  bottomOpen: SERVO_PULSE_MAX,
  paddleClosed: 305,
  paddleOpen: 400,
  pusherLeft: 200,
  pusherNeutral: 305,
  pusherRight: 410,
  pusherHoldDuration: 150,
  paddleCloseDelay: 100,
  paddleOpenDelay: 50,
};

function debugText(feederStopPulse: number | null) {
  return buildCalibrationDebugText({
    channelLayout: "standard",
    moduleCount: 1,
    configs: [{ moduleNumber: 1, calibration: SERVO }],
    feederConfig: { ...DEFAULT_FEEDER_CALIBRATION, speed: 120, reverseSpeed: 490 },
    feederStopPulse,
    binRoutes: [],
    firmwareVersion: "2.13.2",
    board: "esp32",
  });
}

describe("buildCalibrationDebugText", () => {
  it("puts each servo position's percentage in parens after the pulse", () => {
    const text = debugText(null);
    expect(text).toContain(
      `bottom: closed=${SERVO_PULSE_MIN} (0%) open=${SERVO_PULSE_MAX} (100%)`,
    );
    expect(text).toContain("paddle: closed=305 (50%) open=400 (76%)");
    expect(text).toContain("pusher: left=200 (22%) neutral=305 (50%) right=410 (78%)");
    expect(text).toContain("paddleOpenDelay: 50ms");
  });

  it("shows feeder speeds as a percentage and direction around the stop pulse", () => {
    expect(debugText(null)).toContain("speed: 120 (100% forward)");
    expect(debugText(null)).toContain("reverseSpeed: 490 (100% reverse)");
    expect(debugText(null)).toContain("stopPulse: 305 (default)");
    const recentered = debugText(320);
    expect(recentered).toContain("stopPulse: 320");
    expect(recentered).toContain("speed: 120 (100% forward)");
  });

  it("uses the same percentages the Discord embed receives", () => {
    expect(servoPositionPercents(SERVO)).toEqual({
      bottomClosed: 0,
      bottomOpen: 100,
      paddleClosed: 50,
      paddleOpen: 76,
      pusherLeft: 22,
      pusherNeutral: 50,
      pusherRight: 78,
    });
  });
});
