import type { BoardType } from "@/app/routes/build/use-board-type";

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
  esp32_wroom: {
    displayName: "ESP32-WROOM-32",
    shortName: "ESP32",
    irPins: [18, 19, 23, 25, 26],
    hopperIrPin: 27,
    logicVoltage: "3.3V",
    usbCableName: "USB-A-to-USB-C or Micro-USB cable",
    i2cSda: "GPIO21",
    i2cScl: "GPIO22",
  },
};
