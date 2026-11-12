import sharp from "sharp";
import { applyPiScanNudgeCalibration, hasConfirmedPiScanNudgeCalibration } from "./configure";
import {
  DEWARP_OUTPUT_SIZE,
  dewarpRgba,
  executeScanFoilNudge,
  getDefaultCardContour,
  rotateRgba180,
  type FoilNudgeFirmwareLimits,
  type PlayingCardWithDistance,
  type ServoCalibration,
} from "@magic-vault/shared";
import type { PiScanFrameMatch, PiScanLive, PiScanRunContext } from "../interfaces/pi-scan";
import { detectScanCorners, readScanImage, rgbaToJpeg } from "../straighten-scan";
import { grabSettledCameraFrame } from "./camera";

export async function checkPiScanFoil(
  session: PiScanLive,
  context: PiScanRunContext,
  matched: PiScanFrameMatch,
  card: PlayingCardWithDistance,
  calibration: ServoCalibration | null,
  firmwareLimits: FoilNudgeFirmwareLimits | null,
  confirmedCalibration?: ServoCalibration | null,
) {
  const link = session.link;
  if (!link || !context.foilDetectionEnabled || !hasConfirmedPiScanNudgeCalibration(calibration, confirmedCalibration)) return null;
  return executeScanFoilNudge({
    gameKey: context.gameKey,
    forceFoilType: session.foilType,
    foilOnlyFoilType: card.foilOnlyFoilType,
    isReady: true,
    firmwareVersion: link.firmwareVersion,
    calibration,
    firmwareLimits,
    before: await readScanImage(matched.image),
    isActive: () => !session.stopRequested && !session.pauseRequested,
    sendCommand: async (command, timeoutMs) => ({ sent: true, line: JSON.stringify(await link.command(command, timeoutMs)) }),
    prepareMotion: calibration ? () => applyPiScanNudgeCalibration((command, timeoutMs) => link.command(command, timeoutMs), calibration) : undefined,
    capture: async () => {
      const read = await readScanImage(await grabSettledCameraFrame());
      const source = context.flipCamera ? rotateRgba180(read) : read;
      const corners = await detectScanCorners(source);
      const contour = corners.contour ?? getDefaultCardContour(source.width, source.height, context.region);
      return dewarpRgba(source, contour, DEWARP_OUTPUT_SIZE);
    },
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    encodeDiagnostics: async (image) => {
      const jpeg = await sharp(await rgbaToJpeg(image)).resize({ width: 224 }).jpeg({ quality: 80 }).toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    },
  });
}
