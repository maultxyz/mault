import {
  IconBluetooth,
  IconCpu,
  IconLayoutBoard,
  IconUsb,
  type Icon,
} from "@tabler/icons-react";
import type {
  BoardInfo,
  BoardType,
  BuildSectionNavItem,
  BuildSetupState,
  BuildVideo,
  BuildVideoChapter,
  Esp32MountType,
} from "@/lib/interfaces/build";

export const DEFAULT_BOARD_TYPE: BoardType = "uno_r4";

export const MIN_MODULES = 1;
export const MAX_MODULES = 5;
export const DEFAULT_MODULES = 3;

export const KIT_MODULE_COUNT = 3;
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

export const BUILD_ANCHOR_SCROLL_MAX_FRAMES = 120;
export const BUILD_ANCHOR_HIGHLIGHT_MS = 2500;
export const BUILD_ANCHOR_HIGHLIGHT_CLASSES = [
  "ring-2",
  "ring-primary",
  "ring-offset-4",
  "ring-offset-background",
  "rounded-md",
];
export const BOM_ANCHOR_PREFIX = "parts-";

export const BUILD_SETUP_ANCHOR = "setup";

export const BUILD_SECTION_NAV: BuildSectionNavItem[] = [
  { id: BUILD_SETUP_ANCHOR, labelKey: "hero.nav.setup" },
  { id: "parts", labelKey: "hero.nav.parts" },
  { id: "wiring", labelKey: "hero.nav.wiring" },
  { id: "assembly", labelKey: "hero.nav.assembly" },
];

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
