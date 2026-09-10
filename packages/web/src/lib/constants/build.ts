export type BoardType = "uno_r4" | "esp32";

export const DEFAULT_BOARD_TYPE: BoardType = "uno_r4";

export const MIN_MODULES = 1;
export const MAX_MODULES = 5;
export const DEFAULT_MODULES = 3;

export interface BoardInfo {
  displayName: string;
  shortName: string;
  irPins: number[];
  hopperIrPin: number;
  logicVoltage: "5V" | "3.3V";
  usbCableName: string;
  i2cSda: string;
  i2cScl: string;
}

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
  },
};

export const BOARD_BUY_URLS: Partial<Record<BoardType, string>> = {
  uno_r4: "https://amzn.to/4zFfnmv",
  esp32: "https://amzn.to/4gmsm51",
};
