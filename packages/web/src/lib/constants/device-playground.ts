import { SERVO_PULSE_MAX, SERVO_PULSE_MIN } from "@/lib/constants/calibration";
import type {
  DeviceCommand,
  DeviceCommandField,
  DeviceCommandGroup,
  DeviceCommandValues,
} from "@/lib/interfaces/device-playground";
import { maxModulesForLayout } from "@magic-vault/shared";

export const DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS = 5_000;
export const DEVICE_PLAYGROUND_STOP_TIMEOUT_MS = 3_000;
export const DEVICE_PLAYGROUND_LOG_LIMIT = 200;
export const DEVICE_PLAYGROUND_CHANNEL_COUNT = 16;
export const DEVICE_PLAYGROUND_DURATION_MAX_MS = 60_000;

export const DEVICE_COMMAND_GROUPS: DeviceCommandGroup[] = [
  "status",
  "servos",
  "feeder",
  "routing",
  "calibration",
];

const MAX_MODULE = maxModulesForLayout("standard");

const moduleField: DeviceCommandField = {
  name: "module",
  type: "number",
  min: 1,
  max: MAX_MODULE,
  defaultValue: 1,
};

const pulseField = (name: string, defaultValue = 300): DeviceCommandField => ({
  name,
  type: "number",
  min: SERVO_PULSE_MIN,
  max: SERVO_PULSE_MAX,
  defaultValue,
});

const optionalPulseField = (name: string): DeviceCommandField => ({
  name,
  type: "optionalNumber",
  min: SERVO_PULSE_MIN,
  max: SERVO_PULSE_MAX,
  defaultValue: null,
});

const optionalDurationField = (
  name: string,
  feature?: DeviceCommandField["feature"],
): DeviceCommandField => ({
  name,
  type: "optionalNumber",
  min: 0,
  max: DEVICE_PLAYGROUND_DURATION_MAX_MS,
  defaultValue: null,
  feature,
});

const channelField: DeviceCommandField = {
  name: "channel",
  type: "number",
  min: 0,
  max: DEVICE_PLAYGROUND_CHANNEL_COUNT - 1,
  defaultValue: 0,
};

const servoField: DeviceCommandField = {
  name: "servo",
  type: "select",
  options: ["bottom", "paddle", "pusher"],
  defaultValue: "bottom",
};

function withoutEmpty(values: DeviceCommandValues): DeviceCommandValues {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== null && value !== "",
    ),
  );
}

export const DEVICE_COMMANDS: DeviceCommand[] = [
  {
    id: "getStatus",
    command: "getStatus",
    group: "status",
    fields: [],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: () => ({ getStatus: true }),
  },
  {
    id: "readIR",
    command: "readIR",
    group: "status",
    fields: [],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: () => ({ readIR: true }),
  },
  {
    id: "setChannelOffset",
    command: "setChannelOffset",
    group: "status",
    fields: [
      {
        name: "offset",
        type: "select",
        options: ["0", "4"],
        defaultValue: "0",
      },
    ],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ setChannelOffset: Number(v.offset) }),
  },
  {
    id: "test",
    command: "test",
    group: "status",
    fields: [],
    timeoutMs: 30_000,
    build: () => ({ test: true }),
  },
  {
    id: "neutral",
    command: "neutral",
    group: "servos",
    fields: [],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: () => ({ neutral: true }),
  },
  {
    id: "clearDevice",
    command: "clearDevice",
    group: "servos",
    fields: [],
    timeoutMs: 10_000,
    build: () => ({ clearDevice: true }),
  },
  {
    id: "servoPosition",
    command: "servo",
    group: "servos",
    fields: [
      servoField,
      moduleField,
      {
        name: "position",
        type: "select",
        options: ["open", "closed", "left", "neutral", "right"],
        defaultValue: "open",
      },
    ],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ servo: v.servo, module: v.module, position: v.position }),
  },
  {
    id: "servoValue",
    command: "servo",
    group: "servos",
    fields: [servoField, moduleField, pulseField("value")],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ servo: v.servo, module: v.module, value: v.value }),
  },
  {
    id: "channel",
    command: "channel",
    group: "servos",
    fields: [channelField, pulseField("value")],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ channel: v.channel, value: v.value }),
  },
  {
    id: "channelStop",
    command: "channelStop",
    group: "servos",
    fields: [channelField],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ channelStop: v.channel }),
  },
  {
    id: "feeder",
    command: "feeder",
    group: "feeder",
    fields: [],
    timeoutMs: 20_000,
    build: () => ({ feeder: true }),
  },
  {
    id: "feederValue",
    command: "feederValue",
    group: "feeder",
    fields: [pulseField("value", 315)],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ feederValue: v.value }),
  },
  {
    id: "feederStop",
    command: "feederStop",
    group: "feeder",
    fields: [],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: () => ({ feederStop: true }),
  },
  {
    id: "route",
    command: "route",
    group: "routing",
    fields: [
      moduleField,
      {
        name: "direction",
        type: "select",
        options: ["left", "right", "bottom"],
        defaultValue: "left",
      },
      {
        name: "feedNext",
        type: "boolean",
        defaultValue: false,
        feature: "pipelinedFeed",
      },
    ],
    timeoutMs: 25_000,
    build: (v) => ({
      route: {
        module: v.module,
        direction: v.direction,
        ...(v.feedNext ? { feedNext: true } : {}),
      },
    }),
  },
  {
    id: "pushTest",
    command: "pushTest",
    group: "routing",
    fields: [
      moduleField,
      {
        name: "direction",
        type: "select",
        options: ["left", "right"],
        defaultValue: "left",
      },
      optionalDurationField("paddleOpenDelay", "paddleOpenDelay"),
      optionalDurationField("pusherHoldDuration"),
      optionalDurationField("paddleCloseDelay"),
    ],
    timeoutMs: 12_000,
    build: (v) => ({ pushTest: withoutEmpty(v) }),
  },
  {
    id: "setConfig",
    command: "setConfig",
    group: "calibration",
    fields: [
      moduleField,
      optionalPulseField("bottomClosed"),
      optionalPulseField("bottomOpen"),
      optionalPulseField("paddleClosed"),
      optionalPulseField("paddleOpen"),
      optionalPulseField("pusherLeft"),
      optionalPulseField("pusherNeutral"),
      optionalPulseField("pusherRight"),
      optionalDurationField("pusherHoldDuration"),
      optionalDurationField("paddleCloseDelay"),
      optionalDurationField("paddleOpenDelay", "paddleOpenDelay"),
    ],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ setConfig: withoutEmpty(v) }),
  },
  {
    id: "setFeederConfig",
    command: "setFeederConfig",
    group: "calibration",
    fields: [
      optionalPulseField("speed"),
      optionalDurationField("duration"),
      optionalDurationField("pulseDuration"),
      optionalDurationField("pauseDuration"),
      optionalDurationField("settleDuration"),
      { ...optionalPulseField("reverseSpeed"), feature: "feederRollback" },
      optionalDurationField("reverseDuration", "feederRollback"),
    ],
    timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    build: (v) => ({ setFeederConfig: withoutEmpty(v) }),
  },
];
