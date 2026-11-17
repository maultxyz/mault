import type { BrowserSyncWorkCard } from "@magic-vault/shared";
import { MILO_INPUT_SIZE } from "@magic-vault/shared";
import { API_BASE } from "@/lib/constants/api";
import { syncImageUrl } from "@/features/admin/lib/sync-image-url";
import type {
  FailedSyncImage,
  LoadedSyncCanvas,
} from "@/lib/interfaces/admin";

function drawPortrait(
  bitmap: ImageBitmap,
  ctx: CanvasRenderingContext2D,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MILO_INPUT_SIZE, MILO_INPUT_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "low";
  if (bitmap.width > bitmap.height) {
    const upright = document.createElement("canvas");
    upright.width = bitmap.height;
    upright.height = bitmap.width;
    const uprightCtx = upright.getContext("2d");
    if (!uprightCtx) throw new Error("Could not get canvas context");
    uprightCtx.translate(upright.width, 0);
    uprightCtx.rotate(Math.PI / 2);
    uprightCtx.drawImage(bitmap, 0, 0);
    ctx.drawImage(upright, 0, 0, MILO_INPUT_SIZE, MILO_INPUT_SIZE);
    return;
  }
  ctx.drawImage(bitmap, 0, 0, MILO_INPUT_SIZE, MILO_INPUT_SIZE);
}

export async function loadSyncCanvases(
  cards: BrowserSyncWorkCard[],
  signal: AbortSignal,
): Promise<(LoadedSyncCanvas | FailedSyncImage | null)[]> {
  return Promise.all(
    cards.map(async (card) => {
      try {
        const canvas = await loadSyncCanvas(card.imageUrl, signal);
        return { cardId: card.cardId, canvas };
      } catch (err) {
        if (signal.aborted) return null;
        const message = err instanceof Error ? err.message : "Image failed.";
        return { cardId: card.cardId, message };
      }
    }),
  );
}

export async function loadSyncCanvas(
  imageUrl: string,
  signal: AbortSignal,
): Promise<HTMLCanvasElement> {
  const response = await fetch(syncImageUrl(imageUrl, API_BASE), { signal });
  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status})`);
  }
  const bitmap = await createImageBitmap(await response.blob(), {
    imageOrientation: "from-image",
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = MILO_INPUT_SIZE;
    canvas.height = MILO_INPUT_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");
    drawPortrait(bitmap, ctx);
    return canvas;
  } finally {
    bitmap.close();
  }
}
