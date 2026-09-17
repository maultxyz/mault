import {
  AutoProcessor,
  RawImage,
  SiglipVisionModel,
  type DeviceType,
  type Processor,
} from "@huggingface/transformers";
import type { CardCropRegions, OcrRegion } from "@magic-vault/shared";

const MODEL_NAME = "Xenova/siglip-base-patch16-512";

const MODEL_DEVICE = process.env.VECTORIZE_DEVICE as DeviceType | undefined;
const MODEL_DTYPE = MODEL_DEVICE && MODEL_DEVICE !== "cpu" ? "fp32" : "q8";

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

async function vectorizeRawImages(images: RawImage[]): Promise<number[][]> {
  const [model, processor] = await Promise.all([getModel(), getProcessor()]);
  const image_inputs = await processor(images);
  const { pooler_output } = await model(image_inputs);
  return pooler_output.tolist();
}

async function vectorizeRawImage(image: RawImage): Promise<number[]> {
  const [embedding] = await vectorizeRawImages([image]);
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

export interface CardEmbeddings {
  embedding: number[];
  embeddingArt: number[] | null;
  embeddingName: number[] | null;
  embeddingBottom: number[] | null;
}

type CropKey = "embeddingArt" | "embeddingName" | "embeddingBottom";

export async function vectorizeCardImage(
  buffer: Buffer,
  regions?: CardCropRegions,
): Promise<CardEmbeddings> {
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

    const [embedding, ...cropEmbeddings] = await vectorizeRawImages([
      image,
      ...croppedImages,
    ]);

    const result: CardEmbeddings = {
      embedding,
      embeddingArt: null,
      embeddingName: null,
      embeddingBottom: null,
    };
    crops.forEach((c, i) => {
      result[c.key] = cropEmbeddings[i];
    });

    return result;
  } finally {
    releaseScanVectorizeSlot();
  }
}
