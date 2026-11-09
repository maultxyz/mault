import {
  STAMP_SEARCH_MARGIN,
  STAMP_TEMPLATES,
} from "./constants/card-stamps.constant";
import type {
  StampDetection,
  StampTemplate,
  StampTemplateRegion,
} from "./interfaces/card-stamps.interface";
import type { PlayingCard } from "./interfaces/card.interface";
import type { PrintingMarkRegion } from "./interfaces/printing-regions.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";
import { PRINTING_REGIONS_BY_GAME_KEY } from "./constants/printing-regions.constant";
import { PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY } from "./constants/printed-foil-marker.constant";

function luminanceAt(image: RgbaImage, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  const [red, green, blue] =
    image.channelOrder === "bgra"
      ? [image.data[offset + 2], image.data[offset + 1], image.data[offset]]
      : [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
  return 0.299 * red + 0.587 * green + 0.114 * blue;
}

export function sampleLuminanceGrid(
  image: RgbaImage,
  left: number,
  top: number,
  cellWidth: number,
  cellHeight: number,
  columns: number,
  rows: number,
): number[] {
  const grid: number[] = [];
  for (let row = 0; row < rows; row++) {
    const y0 = Math.max(0, Math.floor((top + row * cellHeight) * image.height));
    const y1 = Math.min(
      image.height,
      Math.max(
        y0 + 1,
        Math.ceil((top + (row + 1) * cellHeight) * image.height),
      ),
    );
    for (let column = 0; column < columns; column++) {
      const x0 = Math.max(
        0,
        Math.floor((left + column * cellWidth) * image.width),
      );
      const x1 = Math.min(
        image.width,
        Math.max(
          x0 + 1,
          Math.ceil((left + (column + 1) * cellWidth) * image.width),
        ),
      );
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += luminanceAt(image, x, y);
          count++;
        }
      }
      grid.push(count > 0 ? sum / count : 0);
    }
  }
  return grid;
}

export function stampTemplateGrid(
  image: RgbaImage,
  region: StampTemplateRegion,
): number[] {
  return sampleLuminanceGrid(
    image,
    region.x,
    region.y,
    region.width / region.gridWidth,
    region.height / region.gridHeight,
    region.gridWidth,
    region.gridHeight,
  );
}

function correlationAt(
  scan: number[],
  scanColumns: number,
  offsetColumn: number,
  offsetRow: number,
  template: readonly number[],
  templateColumns: number,
  templateRows: number,
): number {
  const cellCount = templateColumns * templateRows;
  let scanSum = 0;
  let templateSum = 0;
  for (let row = 0; row < templateRows; row++) {
    for (let column = 0; column < templateColumns; column++) {
      scanSum += scan[(row + offsetRow) * scanColumns + column + offsetColumn];
      templateSum += template[row * templateColumns + column];
    }
  }
  const scanMean = scanSum / cellCount;
  const templateMean = templateSum / cellCount;
  let covariance = 0;
  let scanVariance = 0;
  let templateVariance = 0;
  for (let row = 0; row < templateRows; row++) {
    for (let column = 0; column < templateColumns; column++) {
      const scanValue =
        scan[(row + offsetRow) * scanColumns + column + offsetColumn] -
        scanMean;
      const templateValue =
        template[row * templateColumns + column] - templateMean;
      covariance += scanValue * templateValue;
      scanVariance += scanValue * scanValue;
      templateVariance += templateValue * templateValue;
    }
  }
  if (scanVariance === 0 || templateVariance === 0) return 0;
  return covariance / Math.sqrt(scanVariance * templateVariance);
}

export function stampTemplateScore(
  image: RgbaImage,
  template: StampTemplate,
): number {
  const { region } = template;
  const cellWidth = region.width / region.gridWidth;
  const cellHeight = region.height / region.gridHeight;
  const marginColumns = Math.ceil(STAMP_SEARCH_MARGIN / cellWidth);
  const marginRows = Math.ceil(STAMP_SEARCH_MARGIN / cellHeight);
  const columns = region.gridWidth + 2 * marginColumns;
  const rows = region.gridHeight + 2 * marginRows;
  const scan = sampleLuminanceGrid(
    image,
    region.x - marginColumns * cellWidth,
    region.y - marginRows * cellHeight,
    cellWidth,
    cellHeight,
    columns,
    rows,
  );
  let best = -1;
  for (let offsetRow = 0; offsetRow <= rows - region.gridHeight; offsetRow++) {
    for (
      let offsetColumn = 0;
      offsetColumn <= columns - region.gridWidth;
      offsetColumn++
    ) {
      best = Math.max(
        best,
        correlationAt(
          scan,
          columns,
          offsetColumn,
          offsetRow,
          template.values,
          region.gridWidth,
          region.gridHeight,
        ),
      );
    }
  }
  return best;
}

export function detectCardStampRgba(
  image: RgbaImage,
  card: Pick<PlayingCard, "stamps"> | null | undefined,
): StampDetection | null {
  const candidates = STAMP_TEMPLATES.filter((template) =>
    card?.stamps?.includes(template.stamp),
  );
  let best: StampDetection | null = null;
  for (const template of candidates) {
    const score = stampTemplateScore(image, template);
    if (!best || score > best.score) {
      best = {
        stamp: template.stamp,
        score,
        isStampDetected: score >= template.minimumScore,
      };
    }
  }
  return best;
}

export function detectedStampOf(
  stampDetection: StampDetection | null | undefined,
): string | null {
  return stampDetection?.isStampDetected ? stampDetection.stamp : null;
}

export function cardStampOptionsFor(
  card: Pick<PlayingCard, "stamps"> | null | undefined,
  currentStamp: string | null | undefined,
): string[] {
  const stamps = card?.stamps ?? [];
  return currentStamp && !stamps.includes(currentStamp)
    ? [currentStamp, ...stamps]
    : stamps;
}

export function printingMarkRegionsFor(
  gameKey: string | null | undefined,
  card: Pick<PlayingCard, "stamps"> | null | undefined,
): PrintingMarkRegion[] {
  const printingRegions = gameKey
    ? (PRINTING_REGIONS_BY_GAME_KEY[gameKey] ?? [])
    : [];
  const stampRegions = STAMP_TEMPLATES.filter((template) =>
    card?.stamps?.includes(template.stamp),
  ).map(({ key, region }) => ({
    key,
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  }));
  const foilMarkerBand = gameKey
    ? PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY[gameKey]
    : undefined;
  const foilMarkerRegions: PrintingMarkRegion[] = foilMarkerBand
    ? [{ key: "foilMarker", ...foilMarkerBand }]
    : [];
  return [
    ...printingRegions.map(({ key, x, y, width, height }) => ({
      key,
      x,
      y,
      width,
      height,
    })),
    ...stampRegions,
    ...foilMarkerRegions,
  ];
}
