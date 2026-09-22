import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";
import { resolveMiloModelPath } from "./models/model-registry";

// CollectorVision's Milo embedder: MobileViT-XXS backbone, ArcFace-trained,
// 448x448 RGB in, L2-normalised 128-d out. See collector_vision/embedders/neural.py
// upstream (https://github.com/HanClinto/CollectorVision) for the reference
// preprocessing this mirrors.
const INPUT_SIZE = 448;
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

let sessionPromise: Promise<InferenceSession> | null = null;

async function getSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const modelPath = await resolveMiloModelPath();
      console.log("[milo] Loading Milo embedder model...");
      const session = await InferenceSession.create(modelPath);
      console.log("[milo] Milo model loaded (128 dimensions)");
      return session;
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

async function toChwTensor(buffer: Buffer): Promise<Float32Array> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .toColourspace("srgb")
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill", kernel: "linear" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(
      `Expected a 3-channel RGB image, got ${info.channels} channel(s)`,
    );
  }

  const plane = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 3;
    chw[i] = (data[o] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    chw[plane + i] = (data[o + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    chw[2 * plane + i] = (data[o + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return chw;
}

export async function embedCardImage(buffer: Buffer): Promise<number[]> {
  const session = await getSession();
  const chw = await toChwTensor(buffer);
  const tensor = new Tensor("float32", chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const outputs = await session.run({ [inputName]: tensor });
  const raw = outputs[outputName].data as Float32Array;

  let normSq = 0;
  for (let i = 0; i < raw.length; i++) normSq += raw[i] * raw[i];
  const norm = Math.sqrt(normSq);
  const denom = norm > 1e-8 ? norm : 1;

  const embedding = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) embedding[i] = raw[i] / denom;
  return embedding;
}
