import type { CardSearchEmbeddings } from "@magic-vault/shared";
import { embedCardImage } from "./milo";

const SCAN_VECTORIZE_CONCURRENCY = parseInt(
  process.env.SCAN_VECTORIZE_CONCURRENCY ?? "4",
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

export async function vectorizeCardImage(
  buffer: Buffer,
): Promise<CardSearchEmbeddings> {
  await acquireScanVectorizeSlot();
  try {
    const embedding = await embedCardImage(buffer);
    console.log(`[vectorize] Generated ${embedding.length}-dimensional Milo embedding`);
    return { embedding };
  } finally {
    releaseScanVectorizeSlot();
  }
}
