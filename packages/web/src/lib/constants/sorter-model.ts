import type { ModuleDelayField, ServoName } from "@/lib/interfaces/calibration";
import type {
  SorterBaseNode,
  SorterGatePose,
  SorterGateServo,
  SorterMechanism,
  SorterModelPart,
  SorterPrintPart,
  Vec3,
} from "@/lib/interfaces/sorter-model";

export const SORTER_MODEL_URL = "/models/card-sorter.glb";

export const SORTER_MODEL_CAD_MODULE_COUNT = 3;

export const SORTER_BASE_TEMPLATE_COLUMNS: Record<SorterBaseNode, number> = {
  base: 0,
  groundFeeder: 0,
  groundFirst: 1,
  groundMiddle: 2,
  groundEnd: 3,
  sleeves: 3,
  baseBlock: 3,
};

export const SORTER_MODEL_SLOPE: Vec3 = [0.866025, 0, -0.5];
export const SORTER_MODEL_NORMAL: Vec3 = [0.5, 0, 0.866025];
export const SORTER_MODEL_WIDTH: Vec3 = [0, 1, 0];
export const SORTER_MODEL_REVERSE_WIDTH: Vec3 = [0, -1, 0];

export const SORTER_MODULE_SPACING_MM = 90.5;
export const SORTER_MODULE_CENTER: Vec3 = [75, 36, 185];

export const SERVO_DEGREES_PER_TICK = 0.486;
export const SORTER_BOTTOM_DEGREES_PER_TICK = 0.28;
export const SORTER_PUSHER_DEGREES_PER_TICK = 0.35;
export const SORTER_SOLVER_STEP_DEGREES = 2;
export const SERVO_DEGREES_PER_SECOND = 360;
export const SERVO_TEST_STEP_MS = 700;

export const SORTER_PUSHER_NEUTRAL_DEGREES = 15.5;

export const SORTER_MECHANISMS: Record<ServoName, SorterMechanism> = {
  paddle: {
    axis: SORTER_MODEL_SLOPE,
    right: SORTER_MODEL_WIDTH,
    up: SORTER_MODEL_NORMAL,
    hub: [36.0, 190.0],
    horn: "paddleHorn",
    startDegrees: 0,
    linkages: [
      {
        driverPin: [28.6, 187.0],
        rockerPin: [-19.0, 200.6],
        pivot: [-11.5, 203.6],
        coupler: "rightPaddleLink",
        rocker: "rightPaddle",
        startRockerDegrees: 0,
      },
      {
        driverPin: [43.4, 193.0],
        rockerPin: [90.9, 200.3],
        pivot: [83.5, 203.6],
        coupler: "leftPaddleLink",
        rocker: "leftPaddle",
        startRockerDegrees: 0,
      },
    ],
  },
  bottom: {
    axis: SORTER_MODEL_REVERSE_WIDTH,
    right: SORTER_MODEL_SLOPE,
    up: SORTER_MODEL_NORMAL,
    hub: [-8.3, 195.0],
    horn: "bottomHorn",
    startDegrees: 0,
    linkages: [
      {
        driverPin: [-14.0, 190.0],
        rockerPin: [4.8, 196.9],
        pivot: [8.7, 203.6],
        coupler: "bottomLink",
        rocker: "bottomPaddle",
        startRockerDegrees: 0,
      },
    ],
  },
  pusher: {
    axis: SORTER_MODEL_SLOPE,
    right: SORTER_MODEL_WIDTH,
    up: SORTER_MODEL_NORMAL,
    hub: [36.0, 177.7],
    horn: "pusherHorn",
    startDegrees: SORTER_PUSHER_NEUTRAL_DEGREES,
    linkages: [
      {
        driverPin: [22.6, 169.0],
        rockerPin: [14.0, 194.0],
        pivot: [10.5, 188.6],
        coupler: "leftPusherLink",
        rocker: "leftPusher",
        startRockerDegrees: 177,
      },
      {
        driverPin: [42.9, 163.3],
        rockerPin: [55.4, 186.7],
        pivot: [61.5, 188.6],
        coupler: "rightPusherLink",
        rocker: "rightPusher",
        startRockerDegrees: 107,
      },
    ],
  },
};

export const SORTER_GATE_POSE_DEGREES: Record<SorterGateServo, SorterGatePose> =
  {
    paddle: {
      closed: 0,
      openDirection: 1,
      degreesPerTick: SERVO_DEGREES_PER_TICK,
    },
    bottom: {
      closed: -167.7,
      openDirection: 1,
      degreesPerTick: SORTER_BOTTOM_DEGREES_PER_TICK,
    },
  };

export const SORTER_MODEL_VIEW_DIRECTION: Vec3 = [0.62, 0.5, 0.6];
export const SORTER_MODEL_FIT_PADDING = 1.1;
export const SORTER_MODEL_CAMERA_FOV = 35;
export const SORTER_MODEL_FOCUS_LERP = 0.12;
export const SORTER_MODEL_FOCUS_DISTANCE_MM = 300;
export const SORTER_MODEL_HIGHLIGHT_INTENSITY = 0.45;

export const SORTER_MODEL_PART_COLORS: Record<SorterModelPart, string> = {
  paddle: "#3b82f6",
  bottom: "#f59e0b",
  pusher: "#e11d48",
  servo: "#16a34a",
  platform: "#0d9488",
  feeder: "#8b5cf6",
  frame: "#d4d4d8",
};

export const SORTER_PRINT_PART_COLORS: Record<SorterPrintPart, string> = {
  sortingModule: "#4e79a7",
  feederModule: "#b07aa1",
  shroud: "#a0cbe8",
  baseSupportTall: "#f28e2b",
  baseSupportShort: "#edc948",
  baseSupportBreakout: "#ff9da7",
  circuitBoardPlate: "#e15759",
  servoControllerPlate: "#9c755f",
  endPlate: "#59a14f",
  genericPlate: "#d37295",
  binsPlate: "#e8e3d3",
  endBinPlate: "#499894",
  optionalPlate: "#b6992d",
  otherPrinted: "#a1a1aa",
  hardware: "#3f3f46",
};

export const SORTER_PRINT_PART_PATTERN = /^print-([A-Za-z]+)/;
export const SORTER_PRINT_DEFAULT_PART: SorterPrintPart = "otherPrinted";
export const SORTER_PRINT_ALT_LIGHTNESS = -0.12;
export const SORTER_PRINT_DIMMED_OPACITY = 0.12;
export const SORTER_XRAY_OPACITY = 0.3;

export const SORTER_MODEL_LEGEND: SorterModelPart[] = [
  "paddle",
  "bottom",
  "pusher",
  "servo",
  "platform",
  "feeder",
  "frame",
];

export const SORTER_HOTSPOT_POINTS: Record<ServoName, Vec3> = {
  paddle: [72.9, 90, 210],
  bottom: [109.5, 36, 172.3],
  pusher: [81, 36, 192.3],
};
export const SORTER_FEEDER_HOTSPOT_POINT: Vec3 = [-17, 36, 270];
export const SORTER_FEEDER_HOTSPOT_KEY = "feeder";
export const SORTER_FEEDER_ROLLER_NODE = "feederRoller";

export const SORTER_DRAWER_DELAY_FIELDS: Record<ServoName, ModuleDelayField[]> =
  {
    paddle: ["paddleOpenDelay", "paddleCloseDelay"],
    bottom: [],
    pusher: ["pusherHoldDuration"],
  };
