import sharp from "sharp";
import {
  PI_LINK_CAMERA_FRAME_INTERVAL_MS,
  PI_LINK_CAMERA_FRAME_QUALITY,
  PI_LINK_CAMERA_FRAME_WIDTH,
  PI_LINK_CAMERA_SCANNING_FRAME_INTERVAL_MS,
} from "../constants/pi-hosts";
import { PI_CAMERA_HELPER_URL } from "../constants/pi-camera";
import { PI_SCAN_STATUS_TIMEOUT_MS } from "../constants/pi-scan";

export const piLinkCameraRuntime = {
  async readFrame(cameraId: string | undefined): Promise<Buffer | null> {
    const url = new URL(`${PI_CAMERA_HELPER_URL}/frame`);
    if (cameraId) url.searchParams.set("cameraId", cameraId);
    const response = await fetch(url, { signal: AbortSignal.timeout(PI_SCAN_STATUS_TIMEOUT_MS) });
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  },
  shrinkFrame: (jpeg: Buffer) =>
    sharp(jpeg)
      .resize({ width: PI_LINK_CAMERA_FRAME_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: PI_LINK_CAMERA_FRAME_QUALITY })
      .toBuffer(),
  wait: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

export function createPiLinkCameraFeed(
  sendFrame: (image: string) => void,
  currentCameraId: () => string | undefined,
  uplink: { isBackedUp: () => boolean; isScanning: () => boolean },
) {
  let generation = 0;
  let watching = false;

  async function run(runGeneration: number) {
    while (watching && runGeneration === generation) {
      try {
        const frame = uplink.isBackedUp() ? null : await piLinkCameraRuntime.readFrame(currentCameraId());
        if (frame && watching && runGeneration === generation)
          sendFrame((await piLinkCameraRuntime.shrinkFrame(frame)).toString("base64"));
      } catch (error) {
        console.warn("[pi-link] camera frame failed:", error instanceof Error ? error.message : error);
      }
      await piLinkCameraRuntime.wait(
        uplink.isScanning() ? PI_LINK_CAMERA_SCANNING_FRAME_INTERVAL_MS : PI_LINK_CAMERA_FRAME_INTERVAL_MS,
      );
    }
  }

  return {
    setWatching(next: boolean) {
      if (next === watching) return;
      watching = next;
      generation += 1;
      if (watching) void run(generation);
    },
    stop() {
      watching = false;
      generation += 1;
    },
  };
}
