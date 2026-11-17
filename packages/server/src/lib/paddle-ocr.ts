import { readFile } from "node:fs/promises";
import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";
import {
  PADDLE_OCR_BOX_THRESHOLD,
  PADDLE_OCR_DETECTION_MAX_SIDE,
  PADDLE_OCR_DETECTION_MEAN,
  PADDLE_OCR_DETECTION_STD,
  PADDLE_OCR_DETECTION_STRIDE,
  PADDLE_OCR_MIN_BOX_SIDE_PX,
  PADDLE_OCR_PIXEL_THRESHOLD,
  PADDLE_OCR_RECOGNITION_HEIGHT,
  PADDLE_OCR_RECOGNITION_MAX_WIDTH,
  PADDLE_OCR_RECOGNITION_MIN_WIDTH,
  PADDLE_OCR_UNCLIP_RATIO,
} from "./constants/ocr";
import type { OcrBox } from "./interfaces/ocr-calibration";
import type {
  OcrRectangle,
  OcrRgbPixels,
  OcrTextBox,
  PaddleOcrSessions,
} from "./interfaces/ocr";
import { resolvePaddleOcrModelPaths } from "./models/model-registry";

let sessionsPromise: Promise<PaddleOcrSessions> | null = null;

function getSessions(): Promise<PaddleOcrSessions> {
  if (!sessionsPromise) {
    sessionsPromise = (async () => {
      const paths = await resolvePaddleOcrModelPaths();
      const [detection, recognition, dictionary] = await Promise.all([
        InferenceSession.create(paths.detection),
        InferenceSession.create(paths.recognition),
        readFile(paths.dictionary, "utf8"),
      ]);
      console.log("[paddle-ocr] Detection and recognition models loaded");
      return {
        detection,
        recognition,
        dictionary: dictionary.replace(/\r?\n$/, "").split(/\r?\n/),
      };
    })();
    sessionsPromise.catch(() => {
      sessionsPromise = null;
    });
  }
  return sessionsPromise;
}

async function rgbPixels(
  buffer: Buffer,
  window?: OcrRectangle,
): Promise<OcrRgbPixels> {
  const image = sharp(buffer).removeAlpha().toColourspace("srgb");
  const { data, info } = await (window ? image.extract(window) : image)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function strideSize(size: number, scale: number): number {
  return Math.max(
    PADDLE_OCR_DETECTION_STRIDE,
    Math.round((size * scale) / PADDLE_OCR_DETECTION_STRIDE) *
      PADDLE_OCR_DETECTION_STRIDE,
  );
}

function toBgrTensor(
  data: Buffer,
  width: number,
  height: number,
  normalize: (value: number, channel: number) => number,
): Tensor {
  const plane = width * height;
  const input = new Float32Array(3 * plane);
  for (let pixel = 0; pixel < plane; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      input[channel * plane + pixel] = normalize(
        data[pixel * 3 + (2 - channel)] / 255,
        channel,
      );
    }
  }
  return new Tensor("float32", input, [1, 3, height, width]);
}

function boxesFromProbabilityMap(
  probability: Float32Array,
  width: number,
  height: number,
): OcrBox[] {
  const visited = new Uint8Array(width * height);
  const boxes: OcrBox[] = [];
  for (let start = 0; start < probability.length; start++) {
    if (visited[start] || probability[start] <= PADDLE_OCR_PIXEL_THRESHOLD) {
      continue;
    }
    visited[start] = 1;
    const stack = [start];
    let x0 = width;
    let y0 = height;
    let x1 = 0;
    let y1 = 0;
    let scoreSum = 0;
    let pixelCount = 0;
    while (stack.length > 0) {
      const pixel = stack.pop()!;
      const x = pixel % width;
      const y = (pixel - x) / width;
      scoreSum += probability[pixel];
      pixelCount++;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      const neighbours = [
        x > 0 ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (
          neighbour >= 0 &&
          !visited[neighbour] &&
          probability[neighbour] > PADDLE_OCR_PIXEL_THRESHOLD
        ) {
          visited[neighbour] = 1;
          stack.push(neighbour);
        }
      }
    }
    const boxWidth = x1 - x0 + 1;
    const boxHeight = y1 - y0 + 1;
    if (
      Math.min(boxWidth, boxHeight) < PADDLE_OCR_MIN_BOX_SIDE_PX ||
      scoreSum / pixelCount < PADDLE_OCR_BOX_THRESHOLD
    ) {
      continue;
    }
    const unclip =
      (boxWidth * boxHeight * PADDLE_OCR_UNCLIP_RATIO) /
      (2 * (boxWidth + boxHeight));
    boxes.push({
      x0: Math.max(0, (x0 - unclip) / width),
      y0: Math.max(0, (y0 - unclip) / height),
      x1: Math.min(1, (x1 + 1 + unclip) / width),
      y1: Math.min(1, (y1 + 1 + unclip) / height),
    });
  }
  return boxes;
}

async function detectBoxes(
  sessions: PaddleOcrSessions,
  pixels: OcrRgbPixels,
): Promise<OcrBox[]> {
  const scale = Math.min(
    1,
    PADDLE_OCR_DETECTION_MAX_SIDE / Math.max(pixels.width, pixels.height),
  );
  const width = strideSize(pixels.width, scale);
  const height = strideSize(pixels.height, scale);
  const resized = await sharp(pixels.data, {
    raw: { width: pixels.width, height: pixels.height, channels: 3 },
  })
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer();
  const input = toBgrTensor(
    resized,
    width,
    height,
    (value, channel) =>
      (value - PADDLE_OCR_DETECTION_MEAN[channel]) /
      PADDLE_OCR_DETECTION_STD[channel],
  );
  const outputs = await sessions.detection.run({
    [sessions.detection.inputNames[0]]: input,
  });
  const probability = outputs[sessions.detection.outputNames[0]]
    .data as Float32Array;
  return boxesFromProbabilityMap(probability, width, height);
}

function decodeCtc(
  output: Tensor,
  dictionary: string[],
): { text: string; confidence: number } {
  const [, steps, classes] = output.dims;
  const scores = output.data as Float32Array;
  let text = "";
  let previous = -1;
  let confidenceSum = 0;
  let characters = 0;
  for (let step = 0; step < steps; step++) {
    let best = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < classes; index++) {
      const score = scores[step * classes + index];
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }
    if (best !== 0 && best !== previous) {
      text += best <= dictionary.length ? dictionary[best - 1] : " ";
      confidenceSum += bestScore;
      characters++;
    }
    previous = best;
  }
  return {
    text: text.trim(),
    confidence: characters > 0 ? confidenceSum / characters : 0,
  };
}

async function recognizeBox(
  sessions: PaddleOcrSessions,
  pixels: OcrRgbPixels,
  box: OcrBox,
): Promise<{ text: string; confidence: number }> {
  const left = Math.floor(box.x0 * pixels.width);
  const top = Math.floor(box.y0 * pixels.height);
  const width = Math.min(pixels.width - left, Math.ceil(box.x1 * pixels.width) - left);
  const height = Math.min(
    pixels.height - top,
    Math.ceil(box.y1 * pixels.height) - top,
  );
  if (width <= 0 || height <= 0) return { text: "", confidence: 0 };
  const targetWidth = Math.min(
    PADDLE_OCR_RECOGNITION_MAX_WIDTH,
    Math.max(
      PADDLE_OCR_RECOGNITION_MIN_WIDTH,
      Math.ceil((PADDLE_OCR_RECOGNITION_HEIGHT * width) / height),
    ),
  );
  const crop = await sharp(pixels.data, {
    raw: { width: pixels.width, height: pixels.height, channels: 3 },
  })
    .extract({ left, top, width, height })
    .resize(targetWidth, PADDLE_OCR_RECOGNITION_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer();
  const input = toBgrTensor(
    crop,
    targetWidth,
    PADDLE_OCR_RECOGNITION_HEIGHT,
    (value) => (value - 0.5) / 0.5,
  );
  const outputs = await sessions.recognition.run({
    [sessions.recognition.inputNames[0]]: input,
  });
  return decodeCtc(
    outputs[sessions.recognition.outputNames[0]],
    sessions.dictionary,
  );
}

function toImageBox(
  box: OcrBox,
  window: OcrRectangle,
  imageWidth: number,
  imageHeight: number,
): OcrBox {
  return {
    x0: (window.left + box.x0 * window.width) / imageWidth,
    y0: (window.top + box.y0 * window.height) / imageHeight,
    x1: (window.left + box.x1 * window.width) / imageWidth,
    y1: (window.top + box.y1 * window.height) / imageHeight,
  };
}

export async function readTextBoxes(
  buffer: Buffer,
  window?: OcrRectangle,
): Promise<OcrTextBox[]> {
  const sessions = await getSessions();
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  if (width === 0 || height === 0) return [];
  const area = window ?? { left: 0, top: 0, width, height };
  const pixels = await rgbPixels(buffer, area);
  const results: OcrTextBox[] = [];
  for (const box of await detectBoxes(sessions, pixels)) {
    const { text, confidence } = await recognizeBox(sessions, pixels, box);
    if (!text) continue;
    results.push({
      box: toImageBox(box, area, width, height),
      text,
      confidence,
    });
  }
  return results;
}

export async function recognizeRectangle(
  buffer: Buffer,
  rectangle: OcrRectangle,
): Promise<OcrTextBox | null> {
  const sessions = await getSessions();
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  if (width === 0 || height === 0) return null;
  const pixels = await rgbPixels(buffer, rectangle);
  const { text, confidence } = await recognizeBox(sessions, pixels, {
    x0: 0,
    y0: 0,
    x1: 1,
    y1: 1,
  });
  if (!text) return null;
  return {
    box: toImageBox({ x0: 0, y0: 0, x1: 1, y1: 1 }, rectangle, width, height),
    text,
    confidence,
  };
}
