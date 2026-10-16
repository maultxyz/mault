import {
  IMAGENET_MEAN,
  IMAGENET_STD,
  MILO_INPUT_SIZE,
  MILO_MODEL,
  l2Normalize,
  rgbaToChw,
} from "@magic-vault/shared";
import { ort, runOnnxModel } from "./onnx-runtime";

function toImageData(canvas: HTMLCanvasElement): ImageData {
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  const ctx = copy.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(canvas, 0, 0);
  return ctx.getImageData(0, 0, copy.width, copy.height);
}

export function rotateCanvas180(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.translate(out.width, out.height);
  ctx.rotate(Math.PI);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

function toChwTensor(canvas: HTMLCanvasElement): Float32Array {
  return rgbaToChw(toImageData(canvas), IMAGENET_MEAN, IMAGENET_STD);
}

export async function embedCanvas(canvas: HTMLCanvasElement): Promise<number[]> {
  const chw = toChwTensor(canvas);
  const tensor = new ort.Tensor("float32", chw, [1, 3, MILO_INPUT_SIZE, MILO_INPUT_SIZE]);
  const { session, outputs } = await runOnnxModel("milo", MILO_MODEL, (s) => ({
    [s.inputNames[0]]: tensor,
  }));
  const raw = outputs[session.outputNames[0]].data as Float32Array;

  return l2Normalize(raw);
}
