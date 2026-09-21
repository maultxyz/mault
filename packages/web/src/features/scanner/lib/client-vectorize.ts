import {
  CARD_CROP_REGIONS_BY_GAME_KEY,
  type CardSearchEmbeddings,
  type OcrRegion,
} from "@magic-vault/shared";

const MODEL_NAME = "Xenova/siglip-base-patch16-512";

let webGpuSupportPromise: Promise<boolean> | null = null;

function isFirefox(): boolean {
  return /firefox/i.test(navigator.userAgent);
}

async function detectWebGpuSupport(): Promise<boolean> {
  if (isFirefox()) return false;
  const gpu = (
    navigator as unknown as {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }
  ).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

export function isWebGpuSupported(): Promise<boolean> {
  if (!webGpuSupportPromise) webGpuSupportPromise = detectWebGpuSupport();
  return webGpuSupportPromise;
}

type SiglipVisionModel = import("@huggingface/transformers").SiglipVisionModel;
type Processor = import("@huggingface/transformers").Processor;

let modelPromise: Promise<SiglipVisionModel> | null = null;
let processorPromise: Promise<Processor> | null = null;

async function getModel(): Promise<SiglipVisionModel> {
  if (!modelPromise) {
    modelPromise = import("@huggingface/transformers").then(
      ({ SiglipVisionModel }) =>
        SiglipVisionModel.from_pretrained(MODEL_NAME, {
          dtype: "fp32",
          device: "webgpu",
        }),
    );
  }
  return modelPromise;
}

async function getProcessor(): Promise<Processor> {
  if (!processorPromise) {
    processorPromise = import("@huggingface/transformers").then(
      ({ AutoProcessor }) => AutoProcessor.from_pretrained(MODEL_NAME),
    );
  }
  return processorPromise;
}

async function cropToCanvas(
  source: HTMLCanvasElement,
  region: OcrRegion,
): Promise<HTMLCanvasElement> {
  const x = Math.round(region.x * source.width);
  const y = Math.round(region.y * source.height);
  const width = Math.round(region.width * source.width);
  const height = Math.round(region.height * source.height);

  const cropped = document.createElement("canvas");
  cropped.width = width;
  cropped.height = height;
  const ctx = cropped.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return cropped;
}

type CropKey = "embeddingArt" | "embeddingName" | "embeddingBottom";

export async function vectorizeCardImageOnClient(
  canvas: HTMLCanvasElement,
  gameKey: string | undefined,
): Promise<CardSearchEmbeddings> {
  const { RawImage } = await import("@huggingface/transformers");
  const [model, processor] = await Promise.all([getModel(), getProcessor()]);

  const regions = gameKey ? CARD_CROP_REGIONS_BY_GAME_KEY[gameKey] : undefined;
  const crops: { key: CropKey; region: OcrRegion }[] = (
    [
      { key: "embeddingArt" as const, region: regions?.art },
      { key: "embeddingName" as const, region: regions?.name },
      { key: "embeddingBottom" as const, region: regions?.bottom },
    ] satisfies { key: CropKey; region: OcrRegion | undefined }[]
  ).filter((c): c is { key: CropKey; region: OcrRegion } => c.region != null);

  const croppedCanvases = await Promise.all(
    crops.map((c) => cropToCanvas(canvas, c.region)),
  );
  const images = [canvas, ...croppedCanvases].map((c) =>
    RawImage.fromCanvas(c),
  );

  const image_inputs = await processor(images);
  const { pooler_output } = await model(image_inputs);
  const [embedding, ...cropEmbeddings]: number[][] = pooler_output.tolist();

  const result: CardSearchEmbeddings = {
    embedding,
    embeddingArt: null,
    embeddingName: null,
    embeddingBottom: null,
  };
  crops.forEach((c, i) => {
    result[c.key] = cropEmbeddings[i];
  });

  return result;
}
