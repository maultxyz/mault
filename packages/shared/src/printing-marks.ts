import {
  PRINTING_MARK_MAX_CELL_STD,
  PRINTING_MARK_MIN_CALIBRATION_STD,
  PRINTING_MARK_MIN_CELL_DIFFERENCE,
  PRINTING_MARK_MIN_DIFFERING_CELLS,
  PRINTING_MARK_MIN_GROUP_CARDS,
  PRINTING_MARK_MIN_SHARED_CELLS,
  PRINTING_MARK_PRESENT_MIN_CORRELATION,
  PRINTING_MARK_ABSENT_MAX_CORRELATION,
  PRINTING_MARK_SEARCH_MARGIN,
  PRINTING_MARK_SUBSAMPLES_PER_CELL,
  PRINTING_REGIONS_BY_GAME_KEY,
} from "./constants/printing-regions.constant";
import type { ScanOrientation } from "./interfaces/scan-identify.interface";
import type {
  PrintingMarkAccumulator,
  PrintingMarkAlignment,
  PrintingMarkCandidateReference,
  PrintingMarkPoint,
  PrintingMarkReference,
  PrintingMarkScanGrid,
  PrintingMarkScanGrids,
  PrintingMarksPayload,
  PrintingRegion,
} from "./interfaces/printing-regions.interface";
import type { CardContour } from "./interfaces/scanner.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";
import { contourToPoints, solveHomographyDstToSrc } from "./vision";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function printingRegionsOf(
  gameKey: string | null | undefined,
): PrintingRegion[] {
  return gameKey ? (PRINTING_REGIONS_BY_GAME_KEY[gameKey] ?? []) : [];
}

function channelValue(
  image: RgbaImage,
  region: PrintingRegion,
  x: number,
  y: number,
): number {
  const maxX = image.width - 1;
  const maxY = image.height - 1;
  if (x < 0 || y < 0 || x > maxX || y > maxY) return 0;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, maxX);
  const y1 = Math.min(y0 + 1, maxY);
  const fx = x - x0;
  const fy = y - y0;
  const isBgra = image.channelOrder === "bgra";
  const pixel = (px: number, py: number) => {
    const offset = (py * image.width + px) * 4;
    const red = image.data[offset + (isBgra ? 2 : 0)];
    const green = image.data[offset + 1];
    const blue = image.data[offset + (isBgra ? 0 : 2)];
    if (region.channel === "redness")
      return Math.max(0, red - (green + blue) / 2);
    return 0.299 * red + 0.587 * green + 0.114 * blue;
  };
  return (
    pixel(x0, y0) * (1 - fx) * (1 - fy) +
    pixel(x1, y0) * fx * (1 - fy) +
    pixel(x0, y1) * (1 - fx) * fy +
    pixel(x1, y1) * fx * fy
  );
}

function mapToSource(
  homography: number[],
  u: number,
  v: number,
): PrintingMarkPoint {
  const h = homography;
  const w = h[6] * u + h[7] * v + h[8];
  return {
    x: (h[0] * u + h[1] * v + h[2]) / w,
    y: (h[3] * u + h[4] * v + h[5]) / w,
  };
}

function sampleGrid(
  image: RgbaImage,
  homography: number[],
  region: PrintingRegion,
  marginColumns: number,
  marginRows: number,
  orientation: ScanOrientation,
): PrintingMarkScanGrid {
  return sampleChannelGrid(
    image,
    homography,
    region,
    marginColumns,
    marginRows,
    orientation,
  );
}

function sampleChannelGrid(
  image: RgbaImage,
  homography: number[],
  region: PrintingRegion,
  marginColumns: number,
  marginRows: number,
  orientation: ScanOrientation,
): PrintingMarkScanGrid {
  const columns = region.gridWidth + 2 * marginColumns;
  const rows = region.gridHeight + 2 * marginRows;
  const cellWidth = region.width / region.gridWidth;
  const cellHeight = region.height / region.gridHeight;
  const subsamples = PRINTING_MARK_SUBSAMPLES_PER_CELL;
  const values = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      let sum = 0;
      for (let sy = 0; sy < subsamples; sy++) {
        for (let sx = 0; sx < subsamples; sx++) {
          const u =
            region.x +
            (column - marginColumns + (sx + 0.5) / subsamples) * cellWidth;
          const v =
            region.y +
            (row - marginRows + (sy + 0.5) / subsamples) * cellHeight;
          const point =
            orientation === "rotated"
              ? mapToSource(homography, 1 - u, 1 - v)
              : mapToSource(homography, u, v);
          sum += channelValue(image, region, point.x, point.y);
        }
      }
      values[row * columns + column] = sum / (subsamples * subsamples);
    }
  }
  return { region, values, columns, rows };
}

export function contourHomography(contour: CardContour): number[] {
  return solveHomographyDstToSrc(contourToPoints(contour));
}

export function wholeImageHomography(image: RgbaImage): number[] {
  return solveHomographyDstToSrc([
    { x: 0, y: 0 },
    { x: image.width - 1, y: 0 },
    { x: image.width - 1, y: image.height - 1 },
    { x: 0, y: image.height - 1 },
  ]);
}

export function catalogPrintingMarkGrids(
  image: RgbaImage,
  gameKey: string,
): PrintingMarkScanGrid[] {
  const homography = wholeImageHomography(image);
  return printingRegionsOf(gameKey).map((region) =>
    sampleGrid(image, homography, region, 0, 0, "upright"),
  );
}

export function scanPrintingMarkGrids(
  image: RgbaImage,
  homography: number[],
  gameKey: string | null | undefined,
  orientation: ScanOrientation,
): PrintingMarkScanGrids | null {
  const regions = printingRegionsOf(gameKey);
  if (!gameKey || regions.length === 0) return null;
  return {
    gameKey,
    grids: regions.map((region) =>
      sampleGrid(
        image,
        homography,
        region,
        Math.ceil(
          PRINTING_MARK_SEARCH_MARGIN / (region.width / region.gridWidth),
        ),
        Math.ceil(
          PRINTING_MARK_SEARCH_MARGIN / (region.height / region.gridHeight),
        ),
        orientation,
      ),
    ),
  };
}

function toBase64(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    output += BASE64_ALPHABET[a >> 2];
    output += BASE64_ALPHABET[((a & 3) << 4) | (b >> 4)];
    output +=
      i + 1 < bytes.length ? BASE64_ALPHABET[((b & 15) << 2) | (c >> 6)] : "=";
    output += i + 2 < bytes.length ? BASE64_ALPHABET[c & 63] : "=";
  }
  return output;
}

function fromBase64(text: string): Uint8Array | null {
  if (text.length % 4 !== 0) return null;
  const padding = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((text.length / 4) * 3 - padding);
  let byteIndex = 0;
  for (let i = 0; i < text.length; i += 4) {
    const quad = [0, 1, 2, 3].map((offset) =>
      text[i + offset] === "=" ? 0 : BASE64_ALPHABET.indexOf(text[i + offset]),
    );
    if (quad.some((value) => value < 0)) return null;
    const triple = (quad[0] << 18) | (quad[1] << 12) | (quad[2] << 6) | quad[3];
    for (let shift = 16; shift >= 0 && byteIndex < bytes.length; shift -= 8) {
      bytes[byteIndex++] = (triple >> shift) & 255;
    }
  }
  return bytes;
}

export function encodePrintingMarkGrids(grids: PrintingMarkScanGrids): string {
  const total = grids.grids.reduce((sum, grid) => sum + grid.values.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const grid of grids.grids) {
    for (const value of grid.values) {
      bytes[offset++] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }
  return toBase64(bytes);
}

export function decodePrintingMarkGrids(
  encoded: unknown,
  gameKey: string,
): PrintingMarkScanGrids | null {
  if (typeof encoded !== "string" || encoded.length === 0) return null;
  const bytes = fromBase64(encoded);
  const regions = printingRegionsOf(gameKey);
  if (!bytes || regions.length === 0) return null;
  const grids: PrintingMarkScanGrid[] = [];
  let offset = 0;
  for (const region of regions) {
    const columns =
      region.gridWidth +
      2 *
        Math.ceil(
          PRINTING_MARK_SEARCH_MARGIN / (region.width / region.gridWidth),
        );
    const rows =
      region.gridHeight +
      2 *
        Math.ceil(
          PRINTING_MARK_SEARCH_MARGIN / (region.height / region.gridHeight),
        );
    const size = columns * rows;
    if (offset + size > bytes.length) return null;
    grids.push({
      region,
      columns,
      rows,
      values: Float32Array.from(bytes.subarray(offset, offset + size)),
    });
    offset += size;
  }
  return offset === bytes.length ? { gameKey, grids } : null;
}

export function emptyPrintingMarkAccumulator(
  cellCount: number,
): PrintingMarkAccumulator {
  return {
    cardCount: 0,
    sums: new Float64Array(cellCount),
    squares: new Float64Array(cellCount),
  };
}

export function addToPrintingMarkAccumulator(
  accumulator: PrintingMarkAccumulator,
  values: Float32Array,
): void {
  accumulator.cardCount++;
  for (let i = 0; i < values.length; i++) {
    accumulator.sums[i] += values[i];
    accumulator.squares[i] += values[i] * values[i];
  }
}

function withConsistentCells(
  values: Float32Array,
  consistentMask: Uint8Array,
): PrintingMarkReference {
  const consistentCells = Int32Array.from(
    Array.from(consistentMask.keys()).filter(
      (cell) => consistentMask[cell] === 1,
    ),
  );
  return { values, consistentMask, consistentCells };
}

export function printingMarkReferenceOf(
  group: PrintingMarkAccumulator,
): PrintingMarkReference | null {
  if (group.cardCount < PRINTING_MARK_MIN_GROUP_CARDS) return null;
  const cellCount = group.sums.length;
  const values = new Float32Array(cellCount);
  const consistentMask = new Uint8Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    const mean = group.sums[i] / group.cardCount;
    const std = Math.sqrt(
      Math.max(0, group.squares[i] / group.cardCount - mean * mean),
    );
    values[i] = mean;
    if (std <= PRINTING_MARK_MAX_CELL_STD) {
      consistentMask[i] = 1;
    }
  }
  return withConsistentCells(values, consistentMask);
}

function linearFit(
  predicted: number[],
  observed: number[],
): { gain: number; offset: number; correlation: number } | null {
  const count = predicted.length;
  if (count < 2) return null;
  const meanPredicted =
    predicted.reduce((sum, value) => sum + value, 0) / count;
  const meanObserved = observed.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0;
  let predictedEnergy = 0;
  let observedEnergy = 0;
  for (let i = 0; i < count; i++) {
    const p = predicted[i] - meanPredicted;
    const o = observed[i] - meanObserved;
    covariance += p * o;
    predictedEnergy += p * p;
    observedEnergy += o * o;
  }
  const correlation =
    predictedEnergy === 0 || observedEnergy === 0
      ? 0
      : covariance / Math.sqrt(predictedEnergy * observedEnergy);
  if (Math.sqrt(predictedEnergy / count) < PRINTING_MARK_MIN_CALIBRATION_STD) {
    return { gain: 1, offset: meanObserved - meanPredicted, correlation };
  }
  const gain = covariance / predictedEnergy;
  return { gain, offset: meanObserved - gain * meanPredicted, correlation };
}

function scanValueAt(
  scan: PrintingMarkScanGrid,
  cell: number,
  offsetColumn: number,
  offsetRow: number,
): number {
  const { gridWidth } = scan.region;
  return scan.values[
    (Math.floor(cell / gridWidth) + offsetRow) * scan.columns +
      (cell % gridWidth) +
      offsetColumn
  ];
}

export function alignToReference(
  scan: PrintingMarkScanGrid,
  reference: PrintingMarkReference,
): PrintingMarkAlignment {
  const { gridWidth, gridHeight } = scan.region;
  const cells = reference.consistentCells;
  const count = cells.length;
  let referenceSum = 0;
  let referenceSquares = 0;
  for (let i = 0; i < count; i++) {
    const value = reference.values[cells[i]];
    referenceSum += value;
    referenceSquares += value * value;
  }
  const referenceMean = referenceSum / count;
  const referenceEnergy =
    referenceSquares - count * referenceMean * referenceMean;
  let best: PrintingMarkAlignment = { column: 0, row: 0, correlation: -1 };
  if (count < 2 || referenceEnergy <= 0) return best;
  for (let offsetRow = 0; offsetRow <= scan.rows - gridHeight; offsetRow++) {
    for (
      let offsetColumn = 0;
      offsetColumn <= scan.columns - gridWidth;
      offsetColumn++
    ) {
      let scanSum = 0;
      let scanSquares = 0;
      let crossSum = 0;
      for (let i = 0; i < count; i++) {
        const cell = cells[i];
        const value =
          scan.values[
            (Math.floor(cell / gridWidth) + offsetRow) * scan.columns +
              (cell % gridWidth) +
              offsetColumn
          ];
        scanSum += value;
        scanSquares += value * value;
        crossSum += value * reference.values[cell];
      }
      const scanMean = scanSum / count;
      const scanEnergy = scanSquares - count * scanMean * scanMean;
      if (scanEnergy <= 0) continue;
      const covariance = crossSum - count * scanMean * referenceMean;
      const correlation = covariance / Math.sqrt(scanEnergy * referenceEnergy);
      if (correlation > best.correlation) {
        best = { column: offsetColumn, row: offsetRow, correlation };
      }
    }
  }
  return best;
}

function presenceEvidence(alignment: PrintingMarkAlignment): number {
  if (alignment.correlation >= PRINTING_MARK_PRESENT_MIN_CORRELATION) return 1;
  if (alignment.correlation <= PRINTING_MARK_ABSENT_MAX_CORRELATION) return -1;
  return 0;
}

function pairwiseEvidence(
  scan: PrintingMarkScanGrid,
  first: PrintingMarkReference,
  second: PrintingMarkReference,
  alignment: PrintingMarkAlignment,
): number {
  const { gridWidth, gridHeight } = scan.region;
  const cellCount = gridWidth * gridHeight;
  let sharedCount = 0;
  let differingCount = 0;
  for (let cell = 0; cell < cellCount; cell++) {
    const consistentInFirst = first.consistentMask[cell] === 1;
    const consistentInSecond = second.consistentMask[cell] === 1;
    if (!consistentInFirst && !consistentInSecond) continue;
    if (
      Math.abs(first.values[cell] - second.values[cell]) >=
      PRINTING_MARK_MIN_CELL_DIFFERENCE
    ) {
      differingCount++;
    } else if (consistentInFirst && consistentInSecond) {
      sharedCount++;
    }
  }
  if (differingCount < PRINTING_MARK_MIN_DIFFERING_CELLS) return 0;
  const usesSharedCells = sharedCount >= PRINTING_MARK_MIN_SHARED_CELLS;
  const predicted: number[] = [];
  const observed: number[] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    const consistentInFirst = first.consistentMask[cell] === 1;
    const consistentInSecond = second.consistentMask[cell] === 1;
    if (!consistentInFirst && !consistentInSecond) continue;
    const differs =
      Math.abs(first.values[cell] - second.values[cell]) >=
      PRINTING_MARK_MIN_CELL_DIFFERENCE;
    if (
      usesSharedCells &&
      (differs || !consistentInFirst || !consistentInSecond)
    )
      continue;
    predicted.push((first.values[cell] + second.values[cell]) / 2);
    observed.push(scanValueAt(scan, cell, alignment.column, alignment.row));
  }
  const fit = linearFit(predicted, observed);
  if (!fit || fit.gain <= 0) return 0;

  let covariance = 0;
  let observedEnergy = 0;
  let patternEnergy = 0;
  for (let cell = 0; cell < cellCount; cell++) {
    if (!first.consistentMask[cell] && !second.consistentMask[cell]) continue;
    const pattern = first.values[cell] - second.values[cell];
    if (Math.abs(pattern) < PRINTING_MARK_MIN_CELL_DIFFERENCE) continue;
    const value =
      (scanValueAt(scan, cell, alignment.column, alignment.row) - fit.offset) /
      fit.gain;
    const deviation = value - (first.values[cell] + second.values[cell]) / 2;
    covariance += deviation * pattern;
    observedEnergy += deviation * deviation;
    patternEnergy += pattern * pattern;
  }
  return observedEnergy === 0 || patternEnergy === 0
    ? 0
    : covariance / Math.sqrt(observedEnergy * patternEnergy);
}

export function printingMarkEvidence(
  scan: PrintingMarkScanGrid,
  first: PrintingMarkCandidateReference,
  second: PrintingMarkCandidateReference,
  align: (reference: PrintingMarkReference) => PrintingMarkAlignment = (
    reference,
  ) => alignToReference(scan, reference),
): number {
  if (first === "absent") {
    return second && second !== "absent"
      ? -presenceEvidence(align(second))
      : 0;
  }
  if (second === "absent") {
    return first ? presenceEvidence(align(first)) : 0;
  }
  if (!first || !second) return 0;
  return pairwiseEvidence(
    scan,
    first,
    second,
    alignToReference(scan, midpointReference(first, second)),
  );
}

function midpointReference(
  first: PrintingMarkReference,
  second: PrintingMarkReference,
): PrintingMarkReference {
  const values = new Float32Array(first.values.length);
  const consistentMask = new Uint8Array(first.values.length);
  const cells: number[] = [];
  for (let cell = 0; cell < values.length; cell++) {
    values[cell] = (first.values[cell] + second.values[cell]) / 2;
    if (first.consistentMask[cell] || second.consistentMask[cell]) {
      consistentMask[cell] = 1;
      cells.push(cell);
    }
  }
  return { values, consistentMask, consistentCells: Int32Array.from(cells) };
}

export function printingMarksPayload(
  image: RgbaImage,
  contour: CardContour | null | undefined,
  gameKey: string | null | undefined,
  orientation: ScanOrientation,
): PrintingMarksPayload | null {
  if (!contour || !gameKey) return null;
  const grids = scanPrintingMarkGrids(
    image,
    contourHomography(contour),
    gameKey,
    orientation,
  );
  return grids ? { gameKey, encoded: encodePrintingMarkGrids(grids) } : null;
}
