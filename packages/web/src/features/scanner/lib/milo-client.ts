import { MILO_MODEL } from "./model-fetch";
import { loadOnnxSession, ort, runOnnxSession } from "./onnx-runtime";

const INPUT_SIZE = 448;
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

function getSession() {
  return loadOnnxSession("milo", MILO_MODEL);
}

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
  const { data, width, height } = toImageData(canvas);
  const plane = width * height;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 4;
    chw[i] = (data[o] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    chw[plane + i] = (data[o + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    chw[2 * plane + i] = (data[o + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return chw;
}

export async function embedCanvas(canvas: HTMLCanvasElement): Promise<number[]> {
  const session = await getSession();
  const chw = toChwTensor(canvas);
  const tensor = new ort.Tensor("float32", chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const outputs = await runOnnxSession("milo", session, {
    [session.inputNames[0]]: tensor,
  });
  const raw = outputs[session.outputNames[0]].data as Float32Array;

  let normSq = 0;
  for (let i = 0; i < raw.length; i++) normSq += raw[i] * raw[i];
  const norm = Math.sqrt(normSq);
  const denom = norm > 1e-8 ? norm : 1;

  const embedding = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) embedding[i] = raw[i] / denom;
  return embedding;
}
