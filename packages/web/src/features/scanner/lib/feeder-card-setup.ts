import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  FEEDER_CARD_DEFAULT_SETUP,
  FEEDER_CARD_ROTATED_PAGE_QUALITY,
} from "@/lib/constants/scanner";
import { FEEDER_CARD_SETUP_STORAGE_KEY_PREFIX } from "@/lib/constants/storage-keys";
import type { FeederCardRotationDegrees, FeederCardSetup } from "@/lib/interfaces/scanner";
import { feederCardSetupSchema } from "@/schemas/feeder-card-setup.schema";

export function loadFeederCardSetup(scannerKey: string): FeederCardSetup {
  try {
    const raw = localStorage.getItem(FEEDER_CARD_SETUP_STORAGE_KEY_PREFIX + scannerKey);
    const parsed = feederCardSetupSchema.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : FEEDER_CARD_DEFAULT_SETUP;
  } catch {
    return FEEDER_CARD_DEFAULT_SETUP;
  }
}

export function storeFeederCardSetup(scannerKey: string, setup: FeederCardSetup) {
  try {
    localStorage.setItem(
      FEEDER_CARD_SETUP_STORAGE_KEY_PREFIX + scannerKey,
      JSON.stringify(setup),
    );
  } catch (error) {
    console.error("[feeder] could not save the card setup:", error);
  }
}

export function feederCardRotationDegrees(
  setup: Pick<FeederCardSetup, "feedEdge" | "cardTop">,
): FeederCardRotationDegrees {
  const isUpsideDown = setup.cardTop === "upside-down";
  if (setup.feedEdge === "long") return isUpsideDown ? 270 : 90;
  return isUpsideDown ? 180 : 0;
}

export async function rotateScanPage(
  page: File,
  rotationDegrees: FeederCardRotationDegrees,
): Promise<File> {
  if (rotationDegrees === 0) return page;
  const bitmap = await createImageBitmap(page);
  const canvas = document.createElement("canvas");
  try {
    const swapsSides = rotationDegrees === 90 || rotationDegrees === 270;
    canvas.width = swapsSides ? bitmap.height : bitmap.width;
    canvas.height = swapsSides ? bitmap.width : bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotationDegrees * Math.PI) / 180);
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", FEEDER_CARD_ROTATED_PAGE_QUALITY),
    );
    if (!blob) throw new Error("Could not encode the rotated scan");
    return new File([blob], page.name, { type: "image/jpeg" });
  } finally {
    bitmap.close();
    releaseCanvases([canvas]);
  }
}
