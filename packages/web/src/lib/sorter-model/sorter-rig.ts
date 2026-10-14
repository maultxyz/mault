import {
  SERVO_DEGREES_PER_TICK,
  SORTER_GATE_POSE_DEGREES,
  SORTER_PUSHER_NEUTRAL_DEGREES,
  SORTER_SOLVER_STEP_DEGREES,
} from "@/lib/constants/sorter-model";
import { SERVOS } from "@/lib/constants/calibration";
import type { ServoName, SliderKey } from "@/lib/interfaces/calibration";
import type {
  SorterGateServo,
  SorterLinkage,
  SorterMechanism,
  SorterModelViewerProps,
  SorterPartPose,
  SorterServoTargets,
  Vec2,
} from "@/lib/interfaces/sorter-model";
import {
  DEFAULT_CALIBRATION,
  type ServoCalibration,
} from "@magic-vault/shared";

const subtract = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const length = (v: Vec2) => Math.hypot(v[0], v[1]);
const heading = (v: Vec2) => Math.atan2(v[1], v[0]);

function rotateAround(point: Vec2, center: Vec2, angle: number): Vec2 {
  const [x, y] = subtract(point, center);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [center[0] + x * cos - y * sin, center[1] + x * sin + y * cos];
}

function rockerPinFor(linkage: SorterLinkage, driver: Vec2, previous: Vec2) {
  const couplerLength = length(subtract(linkage.rockerPin, linkage.driverPin));
  const rockerLength = length(subtract(linkage.rockerPin, linkage.pivot));
  const toDriver = subtract(driver, linkage.pivot);
  const distance = length(toDriver);
  if (
    distance === 0 ||
    distance > couplerLength + rockerLength ||
    distance < Math.abs(couplerLength - rockerLength)
  ) {
    return null;
  }

  const along =
    (rockerLength ** 2 - couplerLength ** 2 + distance ** 2) / (2 * distance);
  const across = Math.sqrt(Math.max(0, rockerLength ** 2 - along ** 2));
  const ux = toDriver[0] / distance;
  const uy = toDriver[1] / distance;
  const base: Vec2 = [
    linkage.pivot[0] + ux * along,
    linkage.pivot[1] + uy * along,
  ];
  const first: Vec2 = [base[0] - uy * across, base[1] + ux * across];
  const second: Vec2 = [base[0] + uy * across, base[1] - ux * across];
  return length(subtract(first, previous)) <= length(subtract(second, previous))
    ? first
    : second;
}

export function solveMechanism(
  mechanism: SorterMechanism,
  hornDegrees: number,
): SorterPartPose[] {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const start = toRadians(mechanism.startDegrees);
  const target = toRadians(hornDegrees);
  const steps = Math.max(
    1,
    Math.ceil(
      Math.abs(hornDegrees - mechanism.startDegrees) /
        SORTER_SOLVER_STEP_DEGREES,
    ),
  );
  let theta = start;
  let rockerPins = mechanism.linkages.map(
    (linkage) =>
      rockerPinFor(
        linkage,
        rotateAround(linkage.driverPin, mechanism.hub, start),
        rotateAround(
          linkage.rockerPin,
          linkage.pivot,
          toRadians(linkage.startRockerDegrees),
        ),
      ) ?? linkage.rockerPin,
  );

  for (let step = 1; step <= steps; step++) {
    const next = start + ((target - start) * step) / steps;
    const pins = mechanism.linkages.map((linkage, index) =>
      rockerPinFor(
        linkage,
        rotateAround(linkage.driverPin, mechanism.hub, next),
        rockerPins[index],
      ),
    );
    if (pins.some((pin) => !pin)) break;
    rockerPins = pins as Vec2[];
    theta = next;
  }

  const poses: SorterPartPose[] = [
    {
      role: mechanism.horn,
      center: mechanism.hub,
      angle: theta,
      offset: [0, 0],
    },
  ];
  mechanism.linkages.forEach((linkage, index) => {
    const driver = rotateAround(linkage.driverPin, mechanism.hub, theta);
    const rocker = rockerPins[index];
    poses.push({
      role: linkage.rocker,
      center: linkage.pivot,
      angle:
        heading(subtract(rocker, linkage.pivot)) -
        heading(subtract(linkage.rockerPin, linkage.pivot)),
      offset: [0, 0],
    });
    poses.push({
      role: linkage.coupler,
      center: linkage.driverPin,
      angle:
        heading(subtract(rocker, driver)) -
        heading(subtract(linkage.rockerPin, linkage.driverPin)),
      offset: subtract(driver, linkage.driverPin),
    });
  });

  return poses;
}

function directionOf(from: number, to: number, fallback: number) {
  return Math.sign(to - from) || fallback;
}

function gateKeys(servo: SorterGateServo) {
  return servo === "bottom"
    ? ({ closed: "bottomClosed", open: "bottomOpen" } as const)
    : ({ closed: "paddleClosed", open: "paddleOpen" } as const);
}

export function servoHornDegrees(
  servo: ServoName,
  pulse: number,
  saved: ServoCalibration,
) {
  if (servo === "pusher") {
    const toRight = directionOf(
      saved.pusherLeft,
      saved.pusherRight,
      directionOf(
        DEFAULT_CALIBRATION.pusherLeft,
        DEFAULT_CALIBRATION.pusherRight,
        1,
      ),
    );
    return (
      SORTER_PUSHER_NEUTRAL_DEGREES +
      (pulse - saved.pusherNeutral) * SERVO_DEGREES_PER_TICK * toRight
    );
  }

  const keys = gateKeys(servo);
  const pose = SORTER_GATE_POSE_DEGREES[servo];
  const span = saved[keys.open] - saved[keys.closed];
  const travel = span === 0 ? 0 : (pulse - saved[keys.closed]) / span;
  return pose.closed + travel * (pose.open - pose.closed);
}

function restPulse(servo: ServoName, calibration: ServoCalibration) {
  if (servo === "pusher") return calibration.pusherNeutral;
  return servo === "bottom"
    ? calibration.bottomClosed
    : calibration.paddleClosed;
}

function testPulses(servo: ServoName, calibration: ServoCalibration) {
  if (servo === "pusher") {
    return [
      calibration.pusherLeft,
      calibration.pusherNeutral,
      calibration.pusherRight,
      calibration.pusherNeutral,
    ];
  }
  return servo === "bottom"
    ? [calibration.bottomOpen, calibration.bottomClosed]
    : [calibration.paddleOpen, calibration.paddleClosed];
}

function pushTestPulses(servo: ServoName, calibration: ServoCalibration) {
  if (servo === "pusher") return testPulses("pusher", calibration);
  if (servo === "paddle") {
    return [
      calibration.paddleOpen,
      calibration.paddleOpen,
      calibration.paddleOpen,
      calibration.paddleClosed,
    ];
  }
  return [calibration.bottomClosed];
}

export function sorterServoTargets({
  modules,
  configs,
  pendingCalibration,
  active,
  sliderValues,
  testingServos,
  pushTestingModule,
}: SorterModelViewerProps): SorterServoTargets {
  const targets: SorterServoTargets = {};
  for (const module of modules) {
    const saved: ServoCalibration = {
      ...DEFAULT_CALIBRATION,
      ...configs.find((config) => config.moduleNumber === module)?.calibration,
    };
    const calibration: ServoCalibration = {
      ...saved,
      ...pendingCalibration[module],
    };
    for (const { name: servo } of SERVOS) {
      const key: SliderKey = `${module}:${servo}`;
      const rest = restPulse(servo, calibration);
      const pulses = testingServos[key]
        ? testPulses(servo, calibration)
        : pushTestingModule === module
          ? pushTestPulses(servo, calibration)
          : [active[key] ? (sliderValues[key] ?? rest) : rest];
      targets[key] = {
        angles: pulses.map((pulse) => servoHornDegrees(servo, pulse, saved)),
      };
    }
  }
  return targets;
}
