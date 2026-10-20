import { scanWarn } from "@/lib/scan-log";
import {
  CORNER_DETECTOR_INPUT_SIZE,
  CORNER_DETECTOR_MODEL,
  IMAGENET_MEAN,
  IMAGENET_STD,
  DEFAULT_MIN_SHARPNESS,
  parseCornerDetection,
  rgbaToChw,
  type CornerDetection,
} from "@magic-vault/shared";
import { ort, runOnnxModel } from "./onnx-runtime";

let cropCanvas: HTMLCanvasElement | null = null;

function toChwTensor(canvas: HTMLCanvasElement): Float32Array {
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

  return rgbaToChw(
    ctx.getImageData(0, 0, CORNER_DETECTOR_INPUT_SIZE, CORNER_DETECTOR_INPUT_SIZE),
    IMAGENET_MEAN,
    IMAGENET_STD,
  );
}

export async function detectCardCorners(
  canvas: HTMLCanvasElement,
  minSharpness: number = DEFAULT_MIN_SHARPNESS,
): Promise<CornerDetection> {
  const chw = toChwTensor(canvas);

  const tensor = new ort.Tensor("float32", chw, [1, 3, CORNER_DETECTOR_INPUT_SIZE, CORNER_DETECTOR_INPUT_SIZE]);
  const { outputs } = await runOnnxModel(
    "detector",
    CORNER_DETECTOR_MODEL,
    (session) => ({ [session.inputNames[0]]: tensor }),
    { graphOptimizationLevel: "disabled" },
  );

  const detection = parseCornerDetection(
    {
      corners: outputs["corners"].data as Float32Array,
      sharpness: outputs["sharpness"]?.data as Float32Array | undefined,
      presence: outputs["presence"]?.data as Float32Array | undefined,
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
