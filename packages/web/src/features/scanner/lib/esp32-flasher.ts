import {
  ESP32_FIRMWARE_CHIP,
  ESP32_FLASH_BAUD_RATE,
} from "@/lib/constants/firmware";
import type {
  FlashEsp32Result,
  FlashProgressCallbacks,
} from "@/lib/interfaces/scanner";
import { ESPLoader, Transport as EspLoaderTransport } from "esptool-js";

// Talks to the chip's ROM bootloader directly, so this works the same on a
// board running this project's firmware, some other sketch, or nothing at
// all. The released image is a merged bootloader + partitions + app binary,
// which is why it's written whole at offset 0.
export async function flashEsp32Port(
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
      await loader.after("hard_reset").catch(() => {});
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
    await loader.after("hard_reset");
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
