import { describe, expect, it } from "vitest";
import {
  conflictingStressChannel,
  stressChannelPlan,
  stressRestOrder,
} from "@/features/admin/lib/kit-stress-plan";
import type { KitStressPlanInputs } from "@/lib/interfaces/kit-test";
import {
  DEFAULT_CALIBRATION,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
} from "@magic-vault/shared";

const MODULE_TWO_CALIBRATION = {
  ...DEFAULT_CALIBRATION,
  bottomClosed: 300,
  bottomOpen: 250,
  paddleClosed: 310,
  paddleOpen: 260,
  pusherLeft: 240,
  pusherNeutral: 300,
  pusherRight: 360,
};

const STANDARD_INPUTS: KitStressPlanInputs = {
  channelLayout: "standard",
  moduleCalibrations: [
    { moduleNumber: 1, calibration: DEFAULT_CALIBRATION },
    { moduleNumber: 2, calibration: MODULE_TWO_CALIBRATION },
  ],
  hasSavedCalibration: true,
};

describe("kit stress plan", () => {
  it("uses a module's calibrated positions on its channels", () => {
    expect(stressChannelPlan(3, STANDARD_INPUTS)).toEqual({
      channel: 3,
      role: { kind: "moduleServo", moduleNumber: 2, servo: "bottom", isCalibrated: true },
      pulses: { min: 300, max: 250 },
      restPulse: 300,
    });
    expect(stressChannelPlan(5, STANDARD_INPUTS)).toMatchObject({
      role: { servo: "pusher", moduleNumber: 2 },
      pulses: { min: 240, max: 360 },
      restPulse: 300,
    });
  });

  it("falls back to the default calibration for a module without one", () => {
    expect(stressChannelPlan(7, STANDARD_INPUTS)).toMatchObject({
      role: { moduleNumber: 3, servo: "paddle", isCalibrated: false },
      pulses: {
        min: DEFAULT_CALIBRATION.paddleClosed,
        max: DEFAULT_CALIBRATION.paddleOpen,
      },
    });
  });

  it("never cycles the feeder", () => {
    expect(stressChannelPlan(15, STANDARD_INPUTS)).toMatchObject({
      role: { kind: "feeder" },
      pulses: null,
    });
  });

  it("shifts modules on the legacy layout and gives other channels the full range", () => {
    const legacyInputs = { ...STANDARD_INPUTS, channelLayout: "legacy" as const };
    expect(stressChannelPlan(4, legacyInputs).role).toMatchObject({
      moduleNumber: 1,
      servo: "bottom",
    });
    expect(stressChannelPlan(13, legacyInputs).role.kind).toBe("feeder");
    expect(stressChannelPlan(2, legacyInputs)).toMatchObject({
      role: { kind: "unassigned" },
      pulses: { min: SERVO_PULSE_MIN, max: SERVO_PULSE_MAX },
      restPulse: null,
    });
  });

  it("pairs each side paddle with its pusher", () => {
    expect(conflictingStressChannel(4, STANDARD_INPUTS)).toBe(5);
    expect(conflictingStressChannel(5, STANDARD_INPUTS)).toBe(4);
    expect(conflictingStressChannel(3, STANDARD_INPUTS)).toBeNull();
    expect(conflictingStressChannel(15, STANDARD_INPUTS)).toBeNull();
  });

  it("returns pushers to neutral before anything else", () => {
    const plans = [3, 4, 2].map((channel) =>
      stressChannelPlan(channel, STANDARD_INPUTS),
    );
    expect(stressRestOrder(plans).map((plan) => plan.channel)).toEqual([2, 3, 4]);
  });
});
