import {
  ESP32_ERASED_BYTE,
  ESP32_FIRMWARE_CHIP,
  ESP32_FLASH_BAUD_RATE,
  ESP32_FLASH_SECTOR_SIZE,
  ESP32_HARD_RESET_SEQUENCE,
  ESP32_IMAGE_MAGIC_BYTE,
  ESP32_NVS_END,
  ESP32_NVS_START,
  ESP32_PORT_RELEASE_POLL_MS,
  ESP32_PORT_RELEASE_TIMEOUT_MS,
} from "@/lib/constants/firmware";
import { delay } from "@/lib/delay";
import type {
  FlashEsp32Result,
  FlashImagePart,
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

let activeFlashes = 0;

function trimErasedTail(data: Uint8Array): Uint8Array {
  let end = data.length;
  while (end > 0 && data[end - 1] === ESP32_ERASED_BYTE) end--;
  const aligned =
    Math.ceil(end / ESP32_FLASH_SECTOR_SIZE) * ESP32_FLASH_SECTOR_SIZE;
  return data.subarray(0, Math.min(aligned, data.length));
}

function splitAroundNvs(image: Uint8Array): FlashImagePart[] {
  if (image.length <= ESP32_NVS_START) {
    return [{ data: image, address: 0 }];
  }
  const parts: FlashImagePart[] = [
    { data: image.subarray(0, ESP32_NVS_START), address: 0 },
  ];
  const rest = trimErasedTail(image.subarray(ESP32_NVS_END));
  if (rest.length > 0) parts.push({ data: rest, address: ESP32_NVS_END });
  return parts;
}

function isMergedFirmwareImage(image: Uint8Array): boolean {
  return image.length > ESP32_NVS_END && image[0] === ESP32_IMAGE_MAGIC_BYTE;
}

function isPortOpen(port: SerialPort): boolean {
  return port.readable !== null || port.writable !== null;
}

async function closePortIfOpen(port: SerialPort) {
  const deadline = Date.now() + ESP32_PORT_RELEASE_TIMEOUT_MS;
  while (isPortOpen(port) && Date.now() < deadline) {
    try {
      await port.close();
    } catch {
      await delay(ESP32_PORT_RELEASE_POLL_MS);
    }
  }
}

function isPortOpenError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "InvalidStateError" || error.name === "NetworkError")
  );
}

async function disconnectWithTimeout(transport: EspLoaderTransport) {
  await Promise.race([
    transport.disconnect().catch(() => {}),
    delay(ESP32_PORT_RELEASE_TIMEOUT_MS),
  ]);
}

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
    const response = await fetch(firmwareUrl, { cache: "no-cache" });
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

  if (!isMergedFirmwareImage(firmwareData)) {
    return { success: false, reason: "invalid-image" };
  }

  await closePortIfOpen(port);

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
        reason: isPortOpenError(e) ? "port-unavailable" : "no-bootloader",
        error: e instanceof Error ? e.message : undefined,
      };
    }

    const chip = loader.chip.CHIP_NAME;
    if (chip !== ESP32_FIRMWARE_CHIP) {
      await hardReset(espTransport).catch(() => {});
      return { success: false, reason: "wrong-chip", chip };
    }

    const parts = splitAroundNvs(firmwareData);
    const totalBytes = parts.reduce((sum, part) => sum + part.data.length, 0);
    const partStarts = parts.map((_, i) =>
      parts.slice(0, i).reduce((sum, part) => sum + part.data.length, 0),
    );

    await loader.writeFlash({
      fileArray: parts,
      flashMode: "keep",
      flashFreq: "keep",
      flashSize: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        if (totalBytes === 0 || total === 0) {
          callbacks.onProgress(null);
          return;
        }
        const partLength = parts[fileIndex].data.length;
        const partWritten = (written / total) * partLength;
        callbacks.onProgress(
          (partStarts[fileIndex] + partWritten) / totalBytes,
        );
      },
    });

    for (const part of parts) {
      const flashedMd5 = await loader.flashMd5sum(
        part.address,
        part.data.length,
      );
      if (flashedMd5.toLowerCase() !== md5.hex(part.data)) {
        return { success: false, reason: "verify-failed", chip };
      }
    }

    await hardReset(espTransport).catch(() => {});
    return { success: true, chip };
  } catch (e) {
    return {
      success: false,
      reason: "flash-failed",
      error: e instanceof Error ? e.message : undefined,
    };
  } finally {
    await disconnectWithTimeout(espTransport);
  }
}
