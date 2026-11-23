import sharp from "sharp";
import {
  brandedCardHeight,
  renderBrandedCardRow,
  squishToBrandedCard,
} from "../branded-scan-image";
import { BRANDED_SCAN_IMAGE_STRIP_BACKGROUND } from "../constants/branded-scan-image";
import {
  SCAN_NOTIFICATION_IMAGE_CARD_WIDTH,
  SCAN_NOTIFICATION_IMAGE_GAP,
  SCAN_NOTIFICATION_IMAGE_JPEG_QUALITY,
} from "../constants/discord";
import { ALLOWED_IMAGE_HOSTS } from "../constants/urls";
import { fetchProxiedImage } from "../image-proxy-fetch";
import { parseDataUrl, toDataUrl } from "../object-storage";

async function loadReferenceCard(referenceImageUrl: string): Promise<Buffer | null> {
  const isAllowed = (candidate: URL) =>
    candidate.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(candidate.hostname);
  let url: URL;
  try {
    url = new URL(referenceImageUrl);
  } catch {
    console.warn(`[discord] Reference image has an invalid URL (${referenceImageUrl}); posting the scan photo only.`);
    return null;
  }
  if (!isAllowed(url)) {
    console.warn(`[discord] Reference image host is not allowed (${referenceImageUrl}); posting the scan photo only.`);
    return null;
  }
  const image = await fetchProxiedImage(url.toString(), isAllowed).catch((error: unknown) => ({
    failureReason: error instanceof Error ? error.message : String(error),
  }));
  if ("failureReason" in image) {
    console.warn(
      `[discord] Posting the scan photo without its reference image (${referenceImageUrl}): ${image.failureReason}.`,
    );
    return null;
  }
  return sharp(Buffer.from(image.body))
    .resize(SCAN_NOTIFICATION_IMAGE_CARD_WIDTH, brandedCardHeight(SCAN_NOTIFICATION_IMAGE_CARD_WIDTH), {
      fit: "contain",
      background: BRANDED_SCAN_IMAGE_STRIP_BACKGROUND,
    })
    .toBuffer();
}

export async function renderScanNotificationImage(
  capturedImageDataUrl: string,
  referenceImageUrl: string | undefined,
): Promise<string> {
  const captured = parseDataUrl(capturedImageDataUrl);
  if (!captured) return capturedImageDataUrl;
  try {
    const [scanCard, referenceCard] = await Promise.all([
      squishToBrandedCard(captured.body, SCAN_NOTIFICATION_IMAGE_CARD_WIDTH),
      referenceImageUrl ? loadReferenceCard(referenceImageUrl) : Promise.resolve(null),
    ]);
    const branded = await renderBrandedCardRow(
      referenceCard ? [scanCard, referenceCard] : [scanCard],
      {
        cardWidth: SCAN_NOTIFICATION_IMAGE_CARD_WIDTH,
        gap: SCAN_NOTIFICATION_IMAGE_GAP,
        jpegQuality: SCAN_NOTIFICATION_IMAGE_JPEG_QUALITY,
      },
    );
    return toDataUrl(branded, "image/jpeg");
  } catch (error) {
    console.error("[discord] Couldn't render the branded scan image; posting the raw scan photo:", error);
    return capturedImageDataUrl;
  }
}
