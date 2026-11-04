import { MILO_MODEL, l2Normalize } from "@magic-vault/shared";
import { runVisionModel } from "./onnx-runtime";

let scratchCanvas: HTMLCanvasElement | null = null;

function toImageData(canvas: HTMLCanvasElement): ImageData {
  scratchCanvas ??= document.createElement("canvas");
  const copy = scratchCanvas;
  if (copy.width !== canvas.width) copy.width = canvas.width;
  if (copy.height !== canvas.height) copy.height = canvas.height;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.clearRect(0, 0, copy.width, copy.height);
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

export async function embedCanvas(canvas: HTMLCanvasElement): Promise<number[]> {
  const { outputs, outputNames } = await runVisionModel(
    "milo",
    MILO_MODEL,
    toImageData(canvas),
  );

  return l2Normalize(outputs[outputNames[0]]);
}
