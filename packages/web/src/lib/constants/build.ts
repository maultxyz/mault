import {
  IconBluetooth,
  IconCpu,
  IconLayoutBoard,
  IconPhoto,
  IconTable,
  IconUsb,
  type Icon,
} from "@tabler/icons-react";
import type {
  BoardInfo,
  BoardType,
  BuildSetupState,
  BuildVideo,
  BuildVideoChapter,
  Esp32MountType,
  WireColor,
  WireKey,
  WiringViewMode,
} from "@/lib/interfaces/build";
import type { SorterPrintPart } from "@/lib/interfaces/sorter-model";

export const DEFAULT_BOARD_TYPE: BoardType = "uno_r4";

export const MIN_MODULES = 1;
export const MAX_MODULES = 5;
export const DEFAULT_MODULES = 3;

export const KIT_MODULE_COUNT = 3;

export const MODULE_PINS_PER_UNIT_FRONT = 2;
export const MODULE_PINS_PER_PIECE_TOP = 4;
export const KIT_BOARD_TYPE: BoardType = "esp32";

export const BOARD_INFO: Record<BoardType, BoardInfo> = {
  uno_r4: {
    displayName: "Arduino Uno R4",
    shortName: "Uno R4",
    irPins: [2, 3, 4, 6, 7],
    hopperIrPin: 5,
    logicVoltage: "5V",
    usbCableName: "USB-A-to-USB-C cable",
    i2cSda: "SDA",
    i2cScl: "SCL",
    wiringDiagramSrc: "/instructions/wiring_diagram.png",
  },
  esp32: {
    displayName: "ESP32-S3-WROOM-1",
    shortName: "ESP32-S3",
    irPins: [4, 5, 6, 7, 15],
    hopperIrPin: 16,
    logicVoltage: "3.3V",
    usbCableName: "USB-A-to-USB-C cable",
    i2cSda: "GPIO8",
    i2cScl: "GPIO9",
    wiringDiagramSrc: "/instructions/wiring_diagram_esp32.png",
  },
};

export const BOARD_BUY_URLS: Partial<Record<BoardType, string>> = {
  uno_r4: "https://amzn.to/4zFfnmv",
  esp32: "https://amzn.to/4gmsm51",
};

export const BOM_ANCHOR_PREFIX = "parts-";

export const BUILD_SETUP_ANCHOR = "setup";

export const BUILD_SELECTION_BADGE_CLASS =
  "h-6 rounded-md border-border bg-foreground/10 px-2 text-sm font-medium tracking-normal text-foreground normal-case";

export const BUILD_PIN_BADGE_CLASS =
  "inline-flex h-6 items-center rounded-md border border-border bg-foreground/10 px-2 align-middle font-mono text-sm font-medium text-foreground";

export const BUILD_OPTIONAL_BADGE_CLASS =
  "ml-2 h-6 rounded-md border-border bg-foreground/10 px-2 align-middle text-sm font-medium tracking-normal text-foreground normal-case no-underline";

export const BUILD_PARTS_ANCHOR = "parts";
export const BUILD_ASSEMBLY_ANCHOR = "assembly";
export const BUILD_WIRING_ANCHOR = "wiring";

export const PRINT_PART_IMAGE_SIZE = 320;

export const PRINT_PART_IMAGE_PARTS = [
  "sortingModule",
  "feederModule",
  "shroud",
  "baseSupportTall",
  "baseSupportShort",
  "baseSupportBreakout",
  "circuitBoardPlate",
  "servoControllerPlate",
  "endPlate",
  "genericPlate",
  "binsPlate",
  "endBinPlate",
] as const satisfies readonly SorterPrintPart[];

export const FLASH_IN_BROWSER_STEP_KEYS = [
  "flash-in-browser",
  "download-code",
  "install-esp32-core",
  "install-libraries",
  "upload-sketch",
  "confirm-ready",
] as const;

export const WIRE_COLOR_CLASSES: Record<WireColor, string> = {
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  blue: "bg-blue-600",
  red: "bg-red-500",
  black: "bg-neutral-950",
  white: "bg-white",
};

export const BOARD_WIRE_COLORS: Record<
  BoardType,
  Record<WireKey, WireColor>
> = {
  uno_r4: {
    sda: "yellow",
    scl: "green",
    vcc: "red",
    gnd: "black",
    psuPositive: "red",
    psuNegative: "black",
    irSignal: "white",
  },
  esp32: {
    sda: "blue",
    scl: "yellow",
    vcc: "red",
    gnd: "black",
    psuPositive: "red",
    psuNegative: "black",
    irSignal: "white",
  },
};

export const WIRING_VIEW_MODES: WiringViewMode[] = ["table", "diagram"];

export const WIRING_VIEW_MODE_ICONS: Record<WiringViewMode, Icon> = {
  table: IconTable,
  diagram: IconPhoto,
};

export const PCA9685_FEEDER_CHANNEL = 15;

export const BOARD_TYPES: BoardType[] = ["uno_r4", "esp32"];

export const ESP32_MOUNT_TYPES: Esp32MountType[] = ["breakout", "bare"];

export const BOARD_ICONS: Record<BoardType, Icon> = {
  uno_r4: IconUsb,
  esp32: IconBluetooth,
};

export const ESP32_MOUNT_ICONS: Record<Esp32MountType, Icon> = {
  breakout: IconLayoutBoard,
  bare: IconCpu,
};

export const ASSEMBLY_VIDEO_URL = "https://youtu.be/X9Evh9qDk74";

export const ASSEMBLY_VIDEO_CHAPTERS = {
  sortingModule: { key: "sortingModule", startSeconds: 0 },
  feederModule: { key: "feederModule", startSeconds: 770 },
  completeAssembly: { key: "completeAssembly", startSeconds: 1155 },
  calibration: { key: "calibration", startSeconds: 2625 },
} satisfies Record<string, BuildVideoChapter>;

export const ASSEMBLE_MODULES_VIDEO: BuildVideo = {
  url: ASSEMBLY_VIDEO_URL,
  chapters: [
    ASSEMBLY_VIDEO_CHAPTERS.sortingModule,
    ASSEMBLY_VIDEO_CHAPTERS.feederModule,
  ],
};

export const WIRE_AND_CALIBRATE_VIDEO: BuildVideo = {
  url: ASSEMBLY_VIDEO_URL,
  chapters: [
    ASSEMBLY_VIDEO_CHAPTERS.completeAssembly,
    ASSEMBLY_VIDEO_CHAPTERS.calibration,
  ],
};

export const BUILD_SETUP_PARAMS = {
  boardType: "board",
  mountType: "mount",
  moduleCount: "modules",
  usingKit: "kit",
} as const;

export const DEFAULT_ESP32_MOUNT_TYPE: Esp32MountType = "breakout";

export const DEFAULT_BUILD_SETUP: BuildSetupState = {
  boardType: DEFAULT_BOARD_TYPE,
  mountType: DEFAULT_ESP32_MOUNT_TYPE,
  moduleCount: DEFAULT_MODULES,
  usingKit: false,
};
