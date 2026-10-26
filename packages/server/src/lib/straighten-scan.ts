import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";
import {
  CORNER_DETECTOR_INPUT_SIZE,
  DEFAULT_MIN_SHARPNESS,
  DEWARP_OUTPUT_SIZE,
  IMAGENET_MEAN,
  IMAGENET_STD,
  dewarpRgba,
  getDefaultCardContour,
  parseCornerDetection,
  rgbaToChw,
  warpRgba,
  type CornerDetection,
  type RgbaImage,
  type ScanRegion,
} from "@magic-vault/shared";
import { resolveCardDetectorModelPath } from "./models/model-registry";

let sessionPromise: Promise<InferenceSession> | null = null;

function detectorSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = resolveCardDetectorModelPath().then((modelPath) =>
      InferenceSession.create(modelPath, { graphOptimizationLevel: "disabled" }),
    );
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

export async function readScanImage(buffer: Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data),
  };
}

export async function detectScanCorners(image: RgbaImage): Promise<CornerDetection> {
  const scaleX = image.width / CORNER_DETECTOR_INPUT_SIZE;
  const scaleY = image.height / CORNER_DETECTOR_INPUT_SIZE;
  const resized = warpRgba(
    image,
    [image.width, 0, -0.5 + scaleX / 2, 0, image.height, -0.5 + scaleY / 2, 0, 0, 1],
    CORNER_DETECTOR_INPUT_SIZE,
    CORNER_DETECTOR_INPUT_SIZE,
  );
  const chw = rgbaToChw(resized, IMAGENET_MEAN, IMAGENET_STD);
  const session = await detectorSession();
  const tensor = new Tensor("float32", chw, [
    1,
    3,
    CORNER_DETECTOR_INPUT_SIZE,
    CORNER_DETECTOR_INPUT_SIZE,
  ]);
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  return parseCornerDetection(
    {
      corners: outputs.corners.data as Float32Array,
      sharpness: outputs.sharpness?.data as Float32Array | undefined,
      presence: outputs.presence?.data as Float32Array | undefined,
    },
    image.width,
    image.height,
    DEFAULT_MIN_SHARPNESS,
  );
}

export function rgbaToJpeg(image: RgbaImage): Promise<Buffer> {
  return sharp(Buffer.from(image.data), {
    raw: { width: image.width, height: image.height, channels: 4 },
  })
    .jpeg()
    .toBuffer();
}

export async function straightenScan(
  buffer: Buffer,
  region?: ScanRegion,
): Promise<Buffer> {
  const image = await readScanImage(buffer);
  const detection = await detectScanCorners(image);
  const contour =
    detection.contour ??
    (region ? getDefaultCardContour(image.width, image.height, region) : null);
  if (!contour) return buffer;
  return rgbaToJpeg(dewarpRgba(image, contour, DEWARP_OUTPUT_SIZE));
}
