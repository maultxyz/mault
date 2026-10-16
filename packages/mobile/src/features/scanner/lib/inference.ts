import {
  CORNER_DETECTOR_INPUT_SIZE,
  CORNER_DETECTOR_MODEL,
  DEFAULT_MIN_SHARPNESS,
  IMAGENET_MEAN,
  IMAGENET_STD,
  MILO_INPUT_SIZE,
  MILO_MODEL,
  l2Normalize,
  parseCornerDetection,
  rgbaToChw,
  type CornerDetection,
  type RgbaImage,
} from "@magic-vault/shared";
import { DETECTOR_SESSION_KEY, MILO_SESSION_KEY } from "@/lib/constants/scanner";
import type { Image } from "react-native-nitro-image";
import type { CapturedFrame } from "@/lib/interfaces/scanner";
import { resizedPixels } from "./frame";
import { firstOutput, runModel, warmModel } from "./onnx";

const DETECTOR_OPTIONS = { graphOptimizationLevel: "disabled" as const };

export function warmScanModels(): Promise<void> {
  return Promise.all([
    warmModel(DETECTOR_SESSION_KEY, CORNER_DETECTOR_MODEL, DETECTOR_OPTIONS),
    warmModel(MILO_SESSION_KEY, MILO_MODEL),
  ]).then(() => undefined);
}

export function detectCorners(
  frame: CapturedFrame,
  minSharpness = DEFAULT_MIN_SHARPNESS,
): Promise<CornerDetection> {
  return detectCornersInImage(frame.image, frame.pixels.width, frame.pixels.height, minSharpness);
}

export async function detectCornersInImage(
  image: Image,
  width: number,
  height: number,
  minSharpness = DEFAULT_MIN_SHARPNESS,
): Promise<CornerDetection> {
  const input = await resizedPixels(image, CORNER_DETECTOR_INPUT_SIZE, CORNER_DETECTOR_INPUT_SIZE);
  const outputs = await runModel(
    DETECTOR_SESSION_KEY,
    CORNER_DETECTOR_MODEL,
    rgbaToChw(input, IMAGENET_MEAN, IMAGENET_STD),
    [1, 3, CORNER_DETECTOR_INPUT_SIZE, CORNER_DETECTOR_INPUT_SIZE],
    DETECTOR_OPTIONS,
  );
  return parseCornerDetection(
    {
      corners: outputs.corners.data as Float32Array,
      sharpness: outputs.sharpness?.data as Float32Array | undefined,
      presence: outputs.presence?.data as Float32Array | undefined,
    },
    width,
    height,
    minSharpness,
  );
}

export async function embedCard(pixels: RgbaImage): Promise<number[]> {
  const outputs = await runModel(
    MILO_SESSION_KEY,
    MILO_MODEL,
    rgbaToChw(pixels, IMAGENET_MEAN, IMAGENET_STD),
    [1, 3, MILO_INPUT_SIZE, MILO_INPUT_SIZE],
  );
  return l2Normalize(firstOutput(outputs));
}
