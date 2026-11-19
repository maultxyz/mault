import jsQR from "jsqr";
import type {
  QrDecodeWorkerRequest,
  QrDecodeWorkerResponse,
  QrDecodeWorkerScope,
} from "@/lib/interfaces/scanner";

const scope = globalThis as unknown as QrDecodeWorkerScope;

scope.onmessage = (event: MessageEvent<QrDecodeWorkerRequest>) => {
  const { decodeId, pixels, width, height } = event.data;
  let text: string | null = null;
  let failed = false;
  try {
    text =
      jsQR(new Uint8ClampedArray(pixels), width, height, {
        inversionAttempts: "dontInvert",
      })?.data || null;
  } catch {
    failed = true;
  }
  const response: QrDecodeWorkerResponse = { decodeId, text, failed };
  scope.postMessage(response);
};
