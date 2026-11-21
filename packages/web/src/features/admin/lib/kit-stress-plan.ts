import type {
  KitStressChannelPlan,
  KitStressChannelRole,
  KitStressPlanInputs,
} from "@/lib/interfaces/kit-test";
import {
  CHANNEL_OFFSET,
  DEFAULT_CALIBRATION,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  maxModulesForLayout,
  type ServoCalibration,
  type ServoName,
} from "@magic-vault/shared";

const SERVO_NAMES_BY_CHANNEL_OFFSET: ServoName[] = ["bottom", "paddle", "pusher"];

export function stressChannelRole(
  channel: number,
  inputs: KitStressPlanInputs,
): KitStressChannelRole {
  const offset = CHANNEL_OFFSET[inputs.channelLayout];
  const moduleCount = maxModulesForLayout(inputs.channelLayout);
  if (channel === offset + moduleCount * 3) return { kind: "feeder" };
  const moduleChannel = channel - offset;
  if (moduleChannel < 0 || moduleChannel >= moduleCount * 3) {
    return { kind: "unassigned" };
  }
  const moduleNumber = Math.floor(moduleChannel / 3) + 1;
  return {
    kind: "moduleServo",
    moduleNumber,
    servo: SERVO_NAMES_BY_CHANNEL_OFFSET[moduleChannel % 3],
    isCalibrated:
      inputs.hasSavedCalibration &&
      inputs.moduleCalibrations.some(
        (config) => config.moduleNumber === moduleNumber,
      ),
  };
}

function calibratedPositions(servo: ServoName, calibration: ServoCalibration) {
  if (servo === "bottom") {
    return {
      pulses: { min: calibration.bottomClosed, max: calibration.bottomOpen },
      restPulse: calibration.bottomClosed,
    };
  }
  if (servo === "paddle") {
    return {
      pulses: { min: calibration.paddleClosed, max: calibration.paddleOpen },
      restPulse: calibration.paddleClosed,
    };
  }
  return {
    pulses: { min: calibration.pusherLeft, max: calibration.pusherRight },
    restPulse: calibration.pusherNeutral,
  };
}

export function stressChannelPlan(
  channel: number,
  inputs: KitStressPlanInputs,
): KitStressChannelPlan {
  const role = stressChannelRole(channel, inputs);
  if (role.kind === "feeder") {
    return { channel, role, pulses: null, restPulse: null };
  }
  if (role.kind === "unassigned") {
    return {
      channel,
      role,
      pulses: { min: SERVO_PULSE_MIN, max: SERVO_PULSE_MAX },
      restPulse: null,
    };
  }
  const calibration =
    inputs.moduleCalibrations.find(
      (config) => config.moduleNumber === role.moduleNumber,
    )?.calibration ?? DEFAULT_CALIBRATION;
  return { channel, role, ...calibratedPositions(role.servo, calibration) };
}

export function conflictingStressChannel(
  channel: number,
  inputs: KitStressPlanInputs,
): number | null {
  const role = stressChannelRole(channel, inputs);
  if (role.kind !== "moduleServo" || role.servo === "bottom") return null;
  return role.servo === "paddle" ? channel + 1 : channel - 1;
}

export function stressRestOrder(plans: KitStressChannelPlan[]) {
  return [...plans].sort((first, second) => {
    const firstIsPusher =
      first.role.kind === "moduleServo" && first.role.servo === "pusher";
    const secondIsPusher =
      second.role.kind === "moduleServo" && second.role.servo === "pusher";
    return Number(secondIsPusher) - Number(firstIsPusher);
  });
}
