import { scanWarn } from "@/lib/scan-log";
import {
  CORNER_DETECTOR_INPUT_SIZE,
  CORNER_DETECTOR_MODEL,
  DEFAULT_MIN_SHARPNESS,
  parseCornerDetection,
  type CornerDetection,
} from "@magic-vault/shared";
import { runVisionModel } from "./onnx-runtime";

let cropCanvas: HTMLCanvasElement | null = null;

function toDetectorInput(canvas: HTMLCanvasElement): ImageData {
  if (!cropCanvas) {
    cropCanvas = document.createElement("canvas");
    cropCanvas.width = CORNER_DETECTOR_INPUT_SIZE;
    cropCanvas.height = CORNER_DETECTOR_INPUT_SIZE;
  }
  const ctx = cropCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, CORNER_DETECTOR_INPUT_SIZE, CORNER_DETECTOR_INPUT_SIZE);

  return ctx.getImageData(0, 0, CORNER_DETECTOR_INPUT_SIZE, CORNER_DETECTOR_INPUT_SIZE);
}

export async function detectCardCorners(
  canvas: HTMLCanvasElement,
  minSharpness: number = DEFAULT_MIN_SHARPNESS,
): Promise<CornerDetection> {
  const { outputs } = await runVisionModel(
    "detector",
    CORNER_DETECTOR_MODEL,
    toDetectorInput(canvas),
    { alwaysRunOnCpu: true },
  );

  const detection = parseCornerDetection(
    {
      corners: outputs["corners"],
      sharpness: outputs["sharpness"],
      presence: outputs["presence"],
    },
    canvas.width,
    canvas.height,
    minSharpness,
  );

  if (detection.rejectReason === "not_present") {
    scanWarn(
      `[scanner] card rejected: sharpness=${detection.sharpness ?? "n/a"} (min ${minSharpness}), confidence=${detection.confidence.toFixed(3)}`,
    );
  } else if (detection.rejectReason === "unusable_quad") {
    scanWarn("[scanner] card rejected: corners formed an unusable quad");
  }

  return detection;
}
