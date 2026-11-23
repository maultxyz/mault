import { readFileSync } from "node:fs";
import {
  BRAND_ICON_STROKE_PATHS,
  BRAND_ICON_TIGHT_ASPECT_RATIO,
  BRAND_ICON_TIGHT_VIEW_BOX,
  OPEN_GRAPH_IMAGE_HEIGHT,
  OPEN_GRAPH_DEFAULT_THEME,
  OPEN_GRAPH_IMAGE_WIDTH,
  type OpenGraphStat,
  type OpenGraphTheme,
} from "@magic-vault/shared";
import type { Font } from "opentype.js";
import sharp, { type OverlayOptions } from "sharp";
import { db } from "../db";
import { OBJECT_STORAGE_ENABLED } from "./constants/object-storage";
import { OPEN_GRAPH_STAT_ICON_PATHS } from "./constants/open-graph-icons";
import {
  OPEN_GRAPH_ACCENT_BAR_HEIGHT,
  OPEN_GRAPH_CARDS_SHOWN_MAX,
  OPEN_GRAPH_CARD_ASPECT_RATIO,
  OPEN_GRAPH_CARD_CORNER_RADIUS_RATIO,
  OPEN_GRAPH_CARD_SHADOW_BLUR,
  OPEN_GRAPH_EMPTY_VISUAL_LOGO_WIDTH,
  OPEN_GRAPH_EYEBROW_BASELINE,
  OPEN_GRAPH_EYEBROW_FONT_SIZE,
  OPEN_GRAPH_FALLBACK_HEADLINE,
  OPEN_GRAPH_FAN_CARD_ANGLE_DEGREES,
  OPEN_GRAPH_FAN_CARD_DROP_Y,
  OPEN_GRAPH_FAN_CARD_HEIGHT,
  OPEN_GRAPH_FAN_CARD_OFFSET_X,
  OPEN_GRAPH_HEADLINE_FONT_SIZES,
  OPEN_GRAPH_HEADLINE_LINE_HEIGHT,
  OPEN_GRAPH_HEADLINE_MAX_LINES,
  OPEN_GRAPH_HEADLINE_TOP_GAP,
  OPEN_GRAPH_ICON_VIEW_BOX_SIZE,
  OPEN_GRAPH_JPEG_QUALITY,
  OPEN_GRAPH_LOGO_GAP,
  OPEN_GRAPH_LOGO_HEIGHT,
  OPEN_GRAPH_LOGO_TOP,
  OPEN_GRAPH_PADDING_X,
  OPEN_GRAPH_PRIMARY_COLOR,
  OPEN_GRAPH_SINGLE_CARD_HEIGHT,
  OPEN_GRAPH_SORTER_PHOTO_FILE,
  OPEN_GRAPH_SOURCE_IMAGE_TIMEOUT_MS,
  OPEN_GRAPH_STATS_BASELINE,
  OPEN_GRAPH_STATS_MAX_WIDTH,
  OPEN_GRAPH_STAT_FONT_SIZE,
  OPEN_GRAPH_STAT_ICON_GAP,
  OPEN_GRAPH_STAT_ICON_SIZE,
  OPEN_GRAPH_STAT_ICON_STROKE_WIDTH,
  OPEN_GRAPH_STAT_ITEM_GAP,
  OPEN_GRAPH_THEME_PALETTES,
  OPEN_GRAPH_SUBTITLE_FONT_SIZE,
  OPEN_GRAPH_SUBTITLE_LINE_HEIGHT,
  OPEN_GRAPH_SUBTITLE_MAX_LINES,
  OPEN_GRAPH_SUBTITLE_TOP_GAP,
  OPEN_GRAPH_TEXT_MAX_WIDTH,
  OPEN_GRAPH_VISUAL_LEFT,
  OPEN_GRAPH_VISUAL_RADIUS,
  OPEN_GRAPH_VISUAL_RIGHT_MARGIN,
  OPEN_GRAPH_VISUAL_VERTICAL_MARGIN,
  OPEN_GRAPH_WORDMARK_FONT_SIZE,
  OPEN_GRAPH_WORDMARK_TEXT,
} from "./constants/open-graph-image";
import { ALLOWED_IMAGE_HOSTS } from "./constants/urls";
import { fetchProxiedImage } from "./image-proxy-fetch";
import type {
  OpenGraphImageContent,
  OpenGraphImageVisual,
  OpenGraphThemePalette,
} from "./interfaces/open-graph-image";
import { getObject, parseDataUrl } from "./object-storage";
import {
  findServerAssetPath,
  fitTextBlock,
  openGraphFonts,
  textPathData,
  withDrawableCharacters,
} from "./open-graph-text";
import { loadShopPhotoRow } from "./shop-photo";

const VISUAL_WIDTH = OPEN_GRAPH_IMAGE_WIDTH - OPEN_GRAPH_VISUAL_LEFT - OPEN_GRAPH_VISUAL_RIGHT_MARGIN;
const VISUAL_TOP = OPEN_GRAPH_VISUAL_VERTICAL_MARGIN;
const VISUAL_HEIGHT =
  OPEN_GRAPH_IMAGE_HEIGHT - OPEN_GRAPH_ACCENT_BAR_HEIGHT - OPEN_GRAPH_VISUAL_VERTICAL_MARGIN * 2;
const VISUAL_CENTER_X = OPEN_GRAPH_VISUAL_LEFT + VISUAL_WIDTH / 2;
const VISUAL_CENTER_Y = VISUAL_TOP + VISUAL_HEIGHT / 2;
const LAYER_BLEED = 240;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

let sorterPhoto: Buffer | null = null;

function brandMarkSvg(left: number, top: number, height: number, color: string): string {
  const width = height * BRAND_ICON_TIGHT_ASPECT_RATIO;
  const paths = BRAND_ICON_STROKE_PATHS.map((path) => `<path d="${path}"/>`).join("");
  return `<svg x="${left}" y="${top}" width="${width}" height="${height}" viewBox="${BRAND_ICON_TIGHT_VIEW_BOX}" fill="${color}">${paths}</svg>`;
}

function iconSvg(stat: OpenGraphStat, left: number, top: number, palette: OpenGraphThemePalette): string {
  const paths = OPEN_GRAPH_STAT_ICON_PATHS[stat.icon].map((path) => `<path d="${path}"/>`).join("");
  return `<svg x="${left}" y="${top}" width="${OPEN_GRAPH_STAT_ICON_SIZE}" height="${OPEN_GRAPH_STAT_ICON_SIZE}" viewBox="0 0 ${OPEN_GRAPH_ICON_VIEW_BOX_SIZE} ${OPEN_GRAPH_ICON_VIEW_BOX_SIZE}" fill="none" stroke="${palette.secondaryText}" stroke-width="${OPEN_GRAPH_STAT_ICON_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function textPath(font: Font, text: string, left: number, baseline: number, fontSize: number, color: string) {
  return `<path d="${textPathData(font, text, left, baseline, fontSize)}" fill="${color}"/>`;
}

function statsRowSvg(stats: readonly OpenGraphStat[], medium: Font, palette: OpenGraphThemePalette): string {
  const parts: string[] = [];
  const right = OPEN_GRAPH_PADDING_X + OPEN_GRAPH_STATS_MAX_WIDTH;
  let left = OPEN_GRAPH_PADDING_X;
  for (const stat of stats) {
    const text = withDrawableCharacters(medium, stat.text);
    if (!text) continue;
    const textLeft = left + OPEN_GRAPH_STAT_ICON_SIZE + OPEN_GRAPH_STAT_ICON_GAP;
    const textRight = textLeft + medium.getAdvanceWidth(text, OPEN_GRAPH_STAT_FONT_SIZE);
    if (textRight > right) break;
    const iconTop = OPEN_GRAPH_STATS_BASELINE - OPEN_GRAPH_STAT_FONT_SIZE * 0.36 - OPEN_GRAPH_STAT_ICON_SIZE / 2;
    parts.push(iconSvg(stat, left, iconTop, palette));
    parts.push(
      textPath(medium, text, textLeft, OPEN_GRAPH_STATS_BASELINE, OPEN_GRAPH_STAT_FONT_SIZE, palette.foreground),
    );
    left = textRight + OPEN_GRAPH_STAT_ITEM_GAP;
  }
  return parts.join("");
}

function textLayerSvg(content: OpenGraphImageContent, palette: OpenGraphThemePalette): string {
  const { bold, medium } = openGraphFonts();
  const left = OPEN_GRAPH_PADDING_X;
  const parts: string[] = [];

  const markWidth = OPEN_GRAPH_LOGO_HEIGHT * BRAND_ICON_TIGHT_ASPECT_RATIO;
  parts.push(brandMarkSvg(left, OPEN_GRAPH_LOGO_TOP, OPEN_GRAPH_LOGO_HEIGHT, OPEN_GRAPH_PRIMARY_COLOR));
  parts.push(
    textPath(
      bold,
      OPEN_GRAPH_WORDMARK_TEXT,
      left + markWidth + OPEN_GRAPH_LOGO_GAP,
      OPEN_GRAPH_LOGO_TOP + OPEN_GRAPH_LOGO_HEIGHT - 2,
      OPEN_GRAPH_WORDMARK_FONT_SIZE,
      palette.foreground,
    ),
  );

  const eyebrow = withDrawableCharacters(medium, content.eyebrow.toUpperCase());
  if (eyebrow) {
    const block = fitTextBlock(medium, eyebrow, [OPEN_GRAPH_EYEBROW_FONT_SIZE], OPEN_GRAPH_TEXT_MAX_WIDTH, 1);
    parts.push(
      textPath(medium, block.lines[0], left, OPEN_GRAPH_EYEBROW_BASELINE, block.fontSize, palette.eyebrow),
    );
  }

  const headline = withDrawableCharacters(bold, content.headline) || OPEN_GRAPH_FALLBACK_HEADLINE;
  const headlineBlock = fitTextBlock(
    bold,
    headline,
    OPEN_GRAPH_HEADLINE_FONT_SIZES,
    OPEN_GRAPH_TEXT_MAX_WIDTH,
    OPEN_GRAPH_HEADLINE_MAX_LINES,
  );
  let baseline = OPEN_GRAPH_EYEBROW_BASELINE + OPEN_GRAPH_HEADLINE_TOP_GAP + headlineBlock.fontSize;
  headlineBlock.lines.forEach((line, index) => {
    if (index > 0) baseline += headlineBlock.fontSize * OPEN_GRAPH_HEADLINE_LINE_HEIGHT;
    parts.push(textPath(bold, line, left, baseline, headlineBlock.fontSize, palette.foreground));
  });

  const subtitle = withDrawableCharacters(medium, content.subtitle);
  if (subtitle) {
    const subtitleBlock = fitTextBlock(
      medium,
      subtitle,
      [OPEN_GRAPH_SUBTITLE_FONT_SIZE],
      OPEN_GRAPH_TEXT_MAX_WIDTH,
      OPEN_GRAPH_SUBTITLE_MAX_LINES,
    );
    baseline += OPEN_GRAPH_SUBTITLE_TOP_GAP + subtitleBlock.fontSize;
    subtitleBlock.lines.forEach((line, index) => {
      if (index > 0) baseline += subtitleBlock.fontSize * OPEN_GRAPH_SUBTITLE_LINE_HEIGHT;
      parts.push(
        textPath(medium, line, left, baseline, subtitleBlock.fontSize, palette.secondaryText),
      );
    });
  }

  parts.push(statsRowSvg(content.stats, medium, palette));
  parts.push(
    `<rect x="0" y="${OPEN_GRAPH_IMAGE_HEIGHT - OPEN_GRAPH_ACCENT_BAR_HEIGHT}" width="${OPEN_GRAPH_IMAGE_WIDTH}" height="${OPEN_GRAPH_ACCENT_BAR_HEIGHT}" fill="${OPEN_GRAPH_PRIMARY_COLOR}"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OPEN_GRAPH_IMAGE_WIDTH}" height="${OPEN_GRAPH_IMAGE_HEIGHT}">${parts.join("")}</svg>`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs).unref()),
  ]);
}

function isAllowedImageUrl(url: URL): boolean {
  return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname);
}

async function fetchCardImage(imageUrl: string): Promise<Buffer | null> {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (!isAllowedImageUrl(url)) return null;
  const image = await withTimeout(
    fetchProxiedImage(url.toString(), isAllowedImageUrl).catch(() => null),
    OPEN_GRAPH_SOURCE_IMAGE_TIMEOUT_MS,
  );
  return image && !("failureReason" in image) ? Buffer.from(image.body) : null;
}

async function loadShopPhoto(orgId: string): Promise<Buffer | null> {
  const row = await loadShopPhotoRow(db, orgId);
  if (row?.shopPhotoKey && OBJECT_STORAGE_ENABLED) {
    return withTimeout(getObject(row.shopPhotoKey).catch(() => null), OPEN_GRAPH_SOURCE_IMAGE_TIMEOUT_MS);
  }
  return row?.shopPhotoDataUrl ? (parseDataUrl(row.shopPhotoDataUrl)?.body ?? null) : null;
}

function roundedRectMask(width: number, height: number, radius: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`,
  );
}

async function framedPhotoLayers(image: Buffer): Promise<OverlayOptions[]> {
  const photo = await sharp(image)
    .rotate()
    .resize(VISUAL_WIDTH, VISUAL_HEIGHT, { fit: "cover" })
    .ensureAlpha()
    .composite([
      { input: roundedRectMask(VISUAL_WIDTH, VISUAL_HEIGHT, OPEN_GRAPH_VISUAL_RADIUS), blend: "dest-in" },
    ])
    .png()
    .toBuffer();
  return [{ input: photo, left: OPEN_GRAPH_VISUAL_LEFT, top: VISUAL_TOP }];
}

async function cardLayers(
  image: Buffer,
  cardHeight: number,
  angleDegrees: number,
  centerX: number,
  centerY: number,
  palette: OpenGraphThemePalette,
): Promise<OverlayOptions[]> {
  const cardWidth = Math.round(cardHeight * OPEN_GRAPH_CARD_ASPECT_RATIO);
  const radius = Math.round(cardWidth * OPEN_GRAPH_CARD_CORNER_RADIUS_RATIO);
  const roundedCard = await sharp(image)
    .rotate()
    .resize(cardWidth, cardHeight, { fit: "cover" })
    .ensureAlpha()
    .composite([{ input: roundedRectMask(cardWidth, cardHeight, radius), blend: "dest-in" }])
    .png()
    .toBuffer();
  const card = await sharp(roundedCard)
    .rotate(angleDegrees, { background: TRANSPARENT })
    .png()
    .toBuffer({ resolveWithObject: true });
  const shadowMargin = OPEN_GRAPH_CARD_SHADOW_BLUR * 3;
  const shadowSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth + shadowMargin * 2}" height="${cardHeight + shadowMargin * 2}"><rect x="${shadowMargin}" y="${shadowMargin}" width="${cardWidth}" height="${cardHeight}" rx="${radius}" fill="#000" fill-opacity="${palette.cardShadowOpacity}"/></svg>`,
  );
  const blurredShadow = await sharp(shadowSvg).blur(OPEN_GRAPH_CARD_SHADOW_BLUR).png().toBuffer();
  const shadow = await sharp(blurredShadow)
    .rotate(angleDegrees, { background: TRANSPARENT })
    .png()
    .toBuffer({ resolveWithObject: true });
  const shadowDrop = OPEN_GRAPH_CARD_SHADOW_BLUR / 2;
  return [
    {
      input: shadow.data,
      left: Math.round(centerX - shadow.info.width / 2),
      top: Math.round(centerY - shadow.info.height / 2 + shadowDrop),
    },
    {
      input: card.data,
      left: Math.round(centerX - card.info.width / 2),
      top: Math.round(centerY - card.info.height / 2),
    },
  ];
}

async function cardFanLayers(cardImages: Buffer[], palette: OpenGraphThemePalette): Promise<OverlayOptions[]> {
  const centerX = LAYER_BLEED + VISUAL_CENTER_X;
  const centerY = LAYER_BLEED + VISUAL_CENTER_Y;
  const height = OPEN_GRAPH_FAN_CARD_HEIGHT;
  const angle = OPEN_GRAPH_FAN_CARD_ANGLE_DEGREES;
  const offset = OPEN_GRAPH_FAN_CARD_OFFSET_X;
  const drop = OPEN_GRAPH_FAN_CARD_DROP_Y;
  const placements =
    cardImages.length === 1
      ? [{ image: cardImages[0], height: OPEN_GRAPH_SINGLE_CARD_HEIGHT, angle: 0, x: 0, y: 0 }]
      : cardImages.length === 2
        ? [
            { image: cardImages[1], height, angle: angle / 2, x: offset / 2, y: drop / 2 },
            { image: cardImages[0], height, angle: -angle / 2, x: -offset / 2, y: 0 },
          ]
        : [
            { image: cardImages[1], height, angle: -angle, x: -offset, y: drop },
            { image: cardImages[2], height, angle, x: offset, y: drop },
            { image: cardImages[0], height, angle: 0, x: 0, y: 0 },
          ];
  const layers = (
    await Promise.all(
      placements.map((placement) =>
        cardLayers(placement.image, placement.height, placement.angle, centerX + placement.x, centerY + placement.y, palette),
      ),
    )
  ).flat();
  const composed = await sharp({
    create: {
      width: OPEN_GRAPH_IMAGE_WIDTH + LAYER_BLEED * 2,
      height: OPEN_GRAPH_IMAGE_HEIGHT + LAYER_BLEED * 2,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const cropped = await sharp(composed)
    .extract({ left: LAYER_BLEED, top: LAYER_BLEED, width: OPEN_GRAPH_IMAGE_WIDTH, height: OPEN_GRAPH_IMAGE_HEIGHT })
    .png()
    .toBuffer();
  return [{ input: cropped, left: 0, top: 0 }];
}

function emptyVisualLayers(palette: OpenGraphThemePalette): OverlayOptions[] {
  const logoHeight = OPEN_GRAPH_EMPTY_VISUAL_LOGO_WIDTH / BRAND_ICON_TIGHT_ASPECT_RATIO;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VISUAL_WIDTH}" height="${VISUAL_HEIGHT}"><rect width="${VISUAL_WIDTH}" height="${VISUAL_HEIGHT}" rx="${OPEN_GRAPH_VISUAL_RADIUS}" fill="${palette.emptyVisual}"/>${brandMarkSvg((VISUAL_WIDTH - OPEN_GRAPH_EMPTY_VISUAL_LOGO_WIDTH) / 2, (VISUAL_HEIGHT - logoHeight) / 2, logoHeight, OPEN_GRAPH_PRIMARY_COLOR)}</svg>`;
  return [{ input: Buffer.from(svg), left: OPEN_GRAPH_VISUAL_LEFT, top: VISUAL_TOP }];
}

async function cardImagesLayers(cardImageUrls: string[], palette: OpenGraphThemePalette): Promise<OverlayOptions[]> {
  const images = (
    await Promise.all(cardImageUrls.slice(0, OPEN_GRAPH_CARDS_SHOWN_MAX).map(fetchCardImage))
  ).filter((image): image is Buffer => image !== null);
  return images.length > 0 ? cardFanLayers(images, palette) : emptyVisualLayers(palette);
}

async function visualLayers(visual: OpenGraphImageVisual, palette: OpenGraphThemePalette): Promise<OverlayOptions[]> {
  if (visual.kind === "sorterPhoto") {
    sorterPhoto ??= readFileSync(findServerAssetPath(OPEN_GRAPH_SORTER_PHOTO_FILE));
    return framedPhotoLayers(sorterPhoto);
  }
  if (visual.kind === "shopPhoto") {
    const photo = await loadShopPhoto(visual.orgId).catch(() => null);
    return photo ? framedPhotoLayers(photo) : cardImagesLayers(visual.fallbackCardImageUrls, palette);
  }
  return cardImagesLayers(visual.cardImageUrls, palette);
}

export async function renderOpenGraphImage(
  content: OpenGraphImageContent,
  theme: OpenGraphTheme = OPEN_GRAPH_DEFAULT_THEME,
): Promise<Buffer> {
  const palette = OPEN_GRAPH_THEME_PALETTES[theme];
  const visual = await visualLayers(content.visual, palette);
  return sharp({
    create: {
      width: OPEN_GRAPH_IMAGE_WIDTH,
      height: OPEN_GRAPH_IMAGE_HEIGHT,
      channels: 3,
      background: palette.background,
    },
  })
    .composite([...visual, { input: Buffer.from(textLayerSvg(content, palette)), left: 0, top: 0 }])
    .jpeg({ quality: OPEN_GRAPH_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}
