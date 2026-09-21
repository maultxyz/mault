import {
  AutoProcessor,
  RawImage,
  SiglipVisionModel,
  type DataType,
  type DeviceType,
  type Processor,
} from "@huggingface/transformers";
import type {
  CardCropRegions,
  CardSearchEmbeddings,
  OcrRegion,
} from "@magic-vault/shared";

const MODEL_NAME = "Xenova/siglip-base-patch16-512";

const MODEL_DEVICE = process.env.VECTORIZE_DEVICE as DeviceType | undefined;
const MODEL_DTYPE =
  (process.env.VECTORIZE_DTYPE as DataType | undefined) ?? "fp32";

let modelPromise: Promise<SiglipVisionModel> | null = null;
let processorPromise: Promise<Processor> | null = null;

async function getModel(): Promise<SiglipVisionModel> {
  if (!modelPromise) {
    console.log(
      `[vectorize] Loading SigLIP model (device: ${MODEL_DEVICE ?? "default"}, dtype: ${MODEL_DTYPE})...`,
    );
    modelPromise = SiglipVisionModel.from_pretrained(MODEL_NAME, {
      dtype: MODEL_DTYPE,
      device: MODEL_DEVICE,
    });
    await modelPromise;
    console.log(
      "[vectorize] SigLIP model loaded successfully (768 dimensions)",
    );
  }
  return modelPromise;
}

async function getProcessor(): Promise<Processor> {
  if (!processorPromise) {
    processorPromise = AutoProcessor.from_pretrained(MODEL_NAME);
  }
  return processorPromise;
}

async function vectorizeRawImage(image: RawImage): Promise<number[]> {
  const [model, processor] = await Promise.all([getModel(), getProcessor()]);
  const image_inputs = await processor([image]);
  const { pooler_output } = await model(image_inputs);
  const [embedding] = pooler_output.tolist();
  return embedding;
}

async function cropToRegion(
  image: RawImage,
  region: OcrRegion,
): Promise<RawImage> {
  const x_min = Math.round(region.x * image.width);
  const y_min = Math.round(region.y * image.height);
  const x_max = Math.round((region.x + region.width) * image.width);
  const y_max = Math.round((region.y + region.height) * image.height);
  return image.crop([x_min, y_min, x_max, y_max]);
}

async function vectorizeBuffer(buffer: Buffer): Promise<number[]> {
  const uint8Array = new Uint8Array(buffer);
  const image = await RawImage.fromBlob(new Blob([uint8Array]));
  const embedding = await vectorizeRawImage(image);

  console.log(
    `[vectorize] Generated ${embedding.length}-dimensional SigLIP embedding`,
  );

  return embedding;
}

export async function vectorizeImageFromUrl(url: string): Promise<number[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  }
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  return vectorizeBuffer(imageBuffer);
}

const SCAN_VECTORIZE_CONCURRENCY = parseInt(
  process.env.SCAN_VECTORIZE_CONCURRENCY ?? "2",
);

let activeScanVectorizations = 0;
const scanVectorizeQueue: (() => void)[] = [];

async function acquireScanVectorizeSlot(): Promise<void> {
  if (activeScanVectorizations < SCAN_VECTORIZE_CONCURRENCY) {
    activeScanVectorizations++;
    return;
  }
  await new Promise<void>((resolve) => scanVectorizeQueue.push(resolve));
  activeScanVectorizations++;
}

function releaseScanVectorizeSlot(): void {
  activeScanVectorizations--;
  scanVectorizeQueue.shift()?.();
}

type CropKey = "embeddingArt" | "embeddingName" | "embeddingBottom";

export async function vectorizeCardImage(
  buffer: Buffer,
  regions?: CardCropRegions,
): Promise<CardSearchEmbeddings> {
  await acquireScanVectorizeSlot();
  try {
    const uint8Array = new Uint8Array(buffer);
    const image = await RawImage.fromBlob(new Blob([uint8Array]));

    const allCrops: { key: CropKey; region: OcrRegion | undefined }[] = [
      { key: "embeddingArt", region: regions?.art },
      { key: "embeddingName", region: regions?.name },
      { key: "embeddingBottom", region: regions?.bottom },
    ];
    const crops = allCrops.filter(
      (c): c is { key: CropKey; region: OcrRegion } => c.region !== undefined,
    );

    const croppedImages = await Promise.all(
      crops.map((c) => cropToRegion(image, c.region)),
    );

    const result: CardSearchEmbeddings = {
      embedding: await vectorizeRawImage(image),
      embeddingArt: null,
      embeddingName: null,
      embeddingBottom: null,
    };
    for (const [i, c] of crops.entries()) {
      result[c.key] = await vectorizeRawImage(croppedImages[i]);
    }

    return result;
  } finally {
    releaseScanVectorizeSlot();
  }
}
