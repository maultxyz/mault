import {
  ESP32_FIRMWARE_CHIP,
  ESP32_FLASH_BAUD_RATE,
  ESP32_HARD_RESET_SEQUENCE,
} from "@/lib/constants/firmware";
import type {
  FlashEsp32Result,
  FlashProgressCallbacks,
} from "@/lib/interfaces/scanner";
import {
  CustomReset,
  ESPLoader,
  Transport as EspLoaderTransport,
} from "esptool-js";
import { md5 } from "js-md5";

function hardReset(transport: EspLoaderTransport) {
  return new CustomReset(transport, ESP32_HARD_RESET_SEQUENCE).reset();
}

// Talks to the chip's ROM bootloader directly, so this works the same on a
// board running this project's firmware, some other sketch, or nothing at
// all. The released image is a merged bootloader + partitions + app binary,
// which is why it's written whole at offset 0.
let activeFlashes = 0;

export function isFlashInProgress(): boolean {
  return activeFlashes > 0;
}

export async function flashEsp32Port(
  port: SerialPort,
  firmwareUrl: string,
  callbacks: FlashProgressCallbacks,
): Promise<FlashEsp32Result> {
  activeFlashes++;
  try {
    return await flashPort(port, firmwareUrl, callbacks);
  } finally {
    activeFlashes--;
  }
}

async function flashPort(
  port: SerialPort,
  firmwareUrl: string,
  callbacks: FlashProgressCallbacks,
): Promise<FlashEsp32Result> {
  callbacks.onProgress(0);

  let firmwareData: Uint8Array;
  try {
    const response = await fetch(firmwareUrl);
    if (!response.ok) {
      throw new Error(`Failed to download firmware (${response.status})`);
    }
    firmwareData = new Uint8Array(await response.arrayBuffer());
  } catch (e) {
    return {
      success: false,
      reason: "download-failed",
      error: e instanceof Error ? e.message : undefined,
    };
  }

  const espTransport = new EspLoaderTransport(port);
  const loader = new ESPLoader({
    transport: espTransport,
    baudrate: ESP32_FLASH_BAUD_RATE,
    terminal: {
      clean: callbacks.onClearLog,
      writeLine: callbacks.onLog,
      write: callbacks.onLog,
    },
  });

  try {
    try {
      await loader.main();
    } catch (e) {
      return {
        success: false,
        reason: "no-bootloader",
        error: e instanceof Error ? e.message : undefined,
      };
    }

    const chip = loader.chip.CHIP_NAME;
    if (chip !== ESP32_FIRMWARE_CHIP) {
      await hardReset(espTransport).catch(() => {});
      return { success: false, reason: "wrong-chip", chip };
    }

    await loader.writeFlash({
      fileArray: [{ data: firmwareData, address: 0 }],
      flashMode: "keep",
      flashFreq: "keep",
      flashSize: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (_fileIndex, written, total) => {
        callbacks.onProgress(total > 0 ? written / total : null);
      },
    });

    const expectedMd5 = md5.hex(firmwareData);
    const flashedMd5 = await loader.flashMd5sum(0, firmwareData.length);
    if (flashedMd5.toLowerCase() !== expectedMd5) {
      return { success: false, reason: "verify-failed", chip };
    }

    await hardReset(espTransport);
    return { success: true, chip };
  } catch (e) {
    return {
      success: false,
      reason: "flash-failed",
      error: e instanceof Error ? e.message : undefined,
    };
  } finally {
    await espTransport.disconnect().catch(() => {});
  }
}
