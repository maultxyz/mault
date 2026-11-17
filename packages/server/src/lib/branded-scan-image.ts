import {
  BRAND_ICON_STROKE_PATHS,
  BRAND_ICON_TIGHT_ASPECT_RATIO,
  BRAND_ICON_TIGHT_VIEW_BOX,
} from "@magic-vault/shared";
import type { Context } from "hono";
import sharp from "sharp";
import type { AppEnv } from "../middleware/auth";
import {
  BRANDED_SCAN_IMAGE_CARD_ASPECT_RATIO,
  BRANDED_SCAN_IMAGE_GAP_RATIO,
  BRANDED_SCAN_IMAGE_JPEG_QUALITY,
  BRANDED_SCAN_IMAGE_MAX_WIDTH,
  BRANDED_SCAN_IMAGE_MIN_WIDTH,
  BRANDED_SCAN_IMAGE_NOT_FOUND_MESSAGE,
  BRANDED_SCAN_IMAGE_SITE_TEXT_ASCENDER_UNITS,
  BRANDED_SCAN_IMAGE_SITE_TEXT_LEFT_UNITS,
  BRANDED_SCAN_IMAGE_SITE_TEXT_PATH,
  BRANDED_SCAN_IMAGE_SITE_TEXT_RIGHT_UNITS,
  BRANDED_SCAN_IMAGE_STRIP_BACKGROUND,
  BRANDED_SCAN_IMAGE_STRIP_FOREGROUND,
  BRANDED_SCAN_IMAGE_STRIP_HEIGHT_RATIO,
  BRANDED_SCAN_IMAGE_STRIP_PADDING_RATIO,
  BRANDED_SCAN_IMAGE_TEXT_HEIGHT_RATIO,
} from "./constants/branded-scan-image";

function brandStripSvg(width: number, height: number): string {
  const textHeight = height * BRANDED_SCAN_IMAGE_TEXT_HEIGHT_RATIO;
  const textScale = textHeight / BRANDED_SCAN_IMAGE_SITE_TEXT_ASCENDER_UNITS;
  const textWidth =
    (BRANDED_SCAN_IMAGE_SITE_TEXT_RIGHT_UNITS - BRANDED_SCAN_IMAGE_SITE_TEXT_LEFT_UNITS) * textScale;
  const markHeight = textHeight;
  const markWidth = markHeight * BRAND_ICON_TIGHT_ASPECT_RATIO;
  const gap = height * BRANDED_SCAN_IMAGE_GAP_RATIO;
  const left = height * BRANDED_SCAN_IMAGE_STRIP_PADDING_RATIO;
  const markTop = (height - markHeight) / 2;
  const textLeft = left + markWidth + gap - BRANDED_SCAN_IMAGE_SITE_TEXT_LEFT_UNITS * textScale;
  const baseline = (height + textHeight) / 2;
  const markPaths = BRAND_ICON_STROKE_PATHS.map((path) => `<path d="${path}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${BRANDED_SCAN_IMAGE_STRIP_BACKGROUND}"/>
<svg x="${left}" y="${markTop}" width="${markWidth}" height="${markHeight}" viewBox="${BRAND_ICON_TIGHT_VIEW_BOX}" fill="${BRANDED_SCAN_IMAGE_STRIP_FOREGROUND}">${markPaths}</svg>
<path transform="translate(${textLeft} ${baseline}) scale(${textScale})" fill="${BRANDED_SCAN_IMAGE_STRIP_FOREGROUND}" d="${BRANDED_SCAN_IMAGE_SITE_TEXT_PATH}"/>
</svg>`;
}

export async function renderBrandedScanImage(image: Buffer): Promise<Buffer> {
  const metadata = await sharp(image).metadata();
  const cardWidth = Math.min(
    BRANDED_SCAN_IMAGE_MAX_WIDTH,
    Math.max(BRANDED_SCAN_IMAGE_MIN_WIDTH, metadata.width ?? BRANDED_SCAN_IMAGE_MIN_WIDTH),
  );
  const cardHeight = Math.round(cardWidth / BRANDED_SCAN_IMAGE_CARD_ASPECT_RATIO);
  const stripHeight = Math.round(cardWidth * BRANDED_SCAN_IMAGE_STRIP_HEIGHT_RATIO);
  const card = await sharp(image)
    .rotate()
    .resize(cardWidth, cardHeight, { fit: "fill" })
    .toBuffer();
  return sharp({
    create: {
      width: cardWidth,
      height: cardHeight + stripHeight,
      channels: 3,
      background: BRANDED_SCAN_IMAGE_STRIP_BACKGROUND,
    },
  })
    .composite([
      { input: card, top: 0, left: 0 },
      { input: Buffer.from(brandStripSvg(cardWidth, stripHeight)), top: cardHeight, left: 0 },
    ])
    .jpeg({ quality: BRANDED_SCAN_IMAGE_JPEG_QUALITY })
    .toBuffer();
}

export async function brandedScanImageResponse(c: Context<AppEnv>, image: Buffer | null) {
  if (!image) {
    return c.json({ success: false, message: BRANDED_SCAN_IMAGE_NOT_FOUND_MESSAGE }, 404);
  }
  const branded = await renderBrandedScanImage(image);
  return c.body(new Uint8Array(branded), 200, {
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, no-store",
  });
}
