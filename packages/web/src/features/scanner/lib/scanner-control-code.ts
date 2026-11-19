import { isScannerControlCode } from "@magic-vault/shared";
import {
  decodeQrImageData,
  readQrImageData,
} from "@/features/scanner/lib/qr-code";
import { SCANNER_CONTROL_QR_MAX_DIMENSION } from "@/lib/constants/scanner";
import type {
  PendingQrDecode,
  QrDecodeWorkerRequest,
  QrDecodeWorkerResponse,
} from "@/lib/interfaces/scanner";

let scratchCanvas: HTMLCanvasElement | null = null;
let decodeWorker: Worker | null = null;
let decodeWorkerFailed = false;
let nextDecodeId = 1;
const pendingDecodes = new Map<number, PendingQrDecode>();

function decodePendingOnMainThread(): void {
  decodeWorkerFailed = true;
  decodeWorker?.terminate();
  decodeWorker = null;
  const pending = [...pendingDecodes.values()];
  pendingDecodes.clear();
  for (const { image, resolve } of pending) resolve(decodeQrImageData(image));
}

function qrDecodeWorker(): Worker | null {
  if (decodeWorkerFailed || typeof Worker === "undefined") return null;
  if (decodeWorker) return decodeWorker;
  try {
    const worker = new Worker(
      new URL("./qr-decode.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<QrDecodeWorkerResponse>) => {
      const { decodeId, text, failed } = event.data;
      if (failed) {
        decodePendingOnMainThread();
        return;
      }
      const pending = pendingDecodes.get(decodeId);
      pendingDecodes.delete(decodeId);
      pending?.resolve(text);
    };
    worker.onerror = decodePendingOnMainThread;
    decodeWorker = worker;
    return worker;
  } catch {
    decodeWorkerFailed = true;
    return null;
  }
}

function decodeOffMainThread(image: ImageData): Promise<string | null> | null {
  const worker = qrDecodeWorker();
  if (!worker) return null;
  const decodeId = nextDecodeId++;
  return new Promise((resolve) => {
    pendingDecodes.set(decodeId, { image, resolve });
    const request: QrDecodeWorkerRequest = {
      decodeId,
      pixels: image.data.slice().buffer as ArrayBuffer,
      width: image.width,
      height: image.height,
    };
    worker.postMessage(request, [request.pixels]);
  });
}

export async function readScannerControlCode(
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  scratchCanvas ??= document.createElement("canvas");
  const image = readQrImageData(
    canvas,
    canvas.width,
    canvas.height,
    SCANNER_CONTROL_QR_MAX_DIMENSION,
    scratchCanvas,
  );
  if (!image) return null;
  const text =
    (await (decodeOffMainThread(image) ?? decodeQrImageData(image))) ?? null;
  return text && isScannerControlCode(text) ? text : null;
}
