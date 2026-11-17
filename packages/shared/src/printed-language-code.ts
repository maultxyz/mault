import {
  PRINTED_LANGUAGE_CODE_ABSENT_FORM_VALUE,
  PRINTED_LANGUAGE_CODE_ABSENT_MAX_INK_ROWS,
  PRINTED_LANGUAGE_CODE_ANCHOR_END,
  PRINTED_LANGUAGE_CODE_ANCHOR_RUN_HEIGHT,
  PRINTED_LANGUAGE_CODE_ANCHOR_RUN_MIN_INK,
  PRINTED_LANGUAGE_CODE_ANCHOR_START,
  PRINTED_LANGUAGE_CODE_BANDS_BY_GAME_KEY,
  PRINTED_LANGUAGE_CODE_CLEAR_HEIGHT_ABOVE_ZONE,
  PRINTED_LANGUAGE_CODE_CLEAR_MAX_INK,
  PRINTED_LANGUAGE_CODE_EDGE_TOLERANCE_PX,
  PRINTED_LANGUAGE_CODE_MAX_STRAY_INK_PX,
  PRINTED_LANGUAGE_CODE_MIN_WIDTH_OF_ANCHOR,
  PRINTED_LANGUAGE_CODE_MAX_EXTENT,
  PRINTED_LANGUAGE_CODE_MIN_EXTENT,
  PRINTED_LANGUAGE_CODE_MIN_FILL,
  PRINTED_LANGUAGE_CODE_PRESENT_FORM_VALUE,
  PRINTED_LANGUAGE_CODE_SAMPLED_CARD_HEIGHT_PX,
  PRINTED_LANGUAGE_CODE_SAMPLED_CARD_WIDTH_PX,
  PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_GAP_PX,
  PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_INK,
  PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_WIDTH,
  PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MIN_INK,
  PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MIN_WIDTH,
  PRINTED_LANGUAGE_CODE_TEXT_CONTRAST,
  PRINTED_LANGUAGE_CODE_ZONE_END_ABOVE_ANCHOR,
  PRINTED_LANGUAGE_CODE_ZONE_START_ABOVE_ANCHOR,
} from "./constants/printed-language-code.constant";
import type {
  PrintedLanguageCodeBand,
  PrintedLanguageCodeDetection,
  PrintedLanguageCodeUnknownReason,
} from "./interfaces/printed-language-code.interface";
import type { ScanOrientation } from "./interfaces/scan-identify.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";
import { mapToSource, wholeImageHomography } from "./vision";

function unknown(
  unknownReason: PrintedLanguageCodeUnknownReason,
  inkExtentRatio: number | null = null,
): PrintedLanguageCodeDetection {
  return { present: null, unknownReason, inkExtentRatio };
}

function luminanceAt(image: RgbaImage, x: number, y: number): number {
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
    return 0.299 * red + 0.587 * green + 0.114 * blue;
  };
  return (
    pixel(x0, y0) * (1 - fx) * (1 - fy) +
    pixel(x1, y0) * fx * (1 - fy) +
    pixel(x0, y1) * (1 - fx) * fy +
    pixel(x1, y1) * fx * fy
  );
}

function sampleBand(
  image: RgbaImage,
  homography: number[],
  band: PrintedLanguageCodeBand,
  orientation: ScanOrientation,
): { values: Float32Array; columns: number; rows: number } {
  const columns = Math.round(
    band.width * PRINTED_LANGUAGE_CODE_SAMPLED_CARD_WIDTH_PX,
  );
  const rows = Math.round(
    band.height * PRINTED_LANGUAGE_CODE_SAMPLED_CARD_HEIGHT_PX,
  );
  const values = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const u = band.x + ((column + 0.5) / columns) * band.width;
      const v = band.y + ((row + 0.5) / rows) * band.height;
      const point =
        orientation === "rotated"
          ? mapToSource(homography, 1 - u, 1 - v)
          : mapToSource(homography, u, v);
      values[row * columns + column] = luminanceAt(image, point.x, point.y);
    }
  }
  return { values, columns, rows };
}

function median(values: Float32Array): number {
  const sorted = Float32Array.from(values).sort();
  return sorted[sorted.length >> 1] ?? 0;
}

function widestTextColumn(
  inkFractions: number[],
): { first: number; last: number } | null {
  let best: { first: number; last: number } | null = null;
  let current: { first: number; last: number } | null = null;
  inkFractions.forEach((fraction, column) => {
    if (
      fraction < PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MIN_INK ||
      fraction > PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_INK
    ) {
      return;
    }
    if (
      current &&
      column - current.last <= PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_GAP_PX
    ) {
      current.last = column;
    } else {
      current = { first: column, last: column };
    }
    if (!best || current.last - current.first > best.last - best.first) {
      best = { ...current };
    }
  });
  return best;
}

function fractionOf(rows: boolean[], start: number, end: number): number {
  const from = Math.max(0, start);
  const to = Math.min(rows.length, end);
  if (to <= from) return 0;
  let count = 0;
  for (let row = from; row < to; row++) if (rows[row]) count++;
  return count / (to - from);
}

export function detectPrintedLanguageCode(
  image: RgbaImage,
  homography: number[],
  gameKey: string | null | undefined,
  orientation: ScanOrientation,
): PrintedLanguageCodeDetection | null {
  const band = gameKey ? PRINTED_LANGUAGE_CODE_BANDS_BY_GAME_KEY[gameKey] : null;
  if (!band) return null;
  const { values, columns, rows } = sampleBand(
    image,
    homography,
    band,
    orientation,
  );
  const background = median(values);
  const isInk = (column: number, row: number) =>
    Math.abs(values[row * columns + column] - background) >=
    PRINTED_LANGUAGE_CODE_TEXT_CONTRAST;

  const inkFractions = Array.from({ length: columns }, (_, column) => {
    let count = 0;
    for (let row = 0; row < rows; row++) if (isInk(column, row)) count++;
    return count / rows;
  });
  const textColumn = widestTextColumn(inkFractions);
  const columnWidth = textColumn
    ? (textColumn.last - textColumn.first + 1) /
      PRINTED_LANGUAGE_CODE_SAMPLED_CARD_WIDTH_PX
    : 0;
  if (
    !textColumn ||
    columnWidth < PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MIN_WIDTH ||
    columnWidth > PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_WIDTH
  ) {
    return unknown("noTextColumn");
  }

  const inkRows = Array.from({ length: rows }, (_, row) => {
    for (let column = textColumn.first; column <= textColumn.last; column++) {
      if (isInk(column, row)) return true;
    }
    return false;
  });
  const rowOf = (cardY: number) =>
    Math.round(
      ((cardY - band.y) / band.height) * rows,
    );
  const rowsFor = (cardHeight: number) =>
    Math.round(cardHeight * PRINTED_LANGUAGE_CODE_SAMPLED_CARD_HEIGHT_PX);

  const anchorRunRows = rowsFor(PRINTED_LANGUAGE_CODE_ANCHOR_RUN_HEIGHT);
  let anchorRow = -1;
  for (
    let row = rowOf(PRINTED_LANGUAGE_CODE_ANCHOR_START);
    row < rowOf(PRINTED_LANGUAGE_CODE_ANCHOR_END);
    row++
  ) {
    if (
      inkRows[row] &&
      fractionOf(inkRows, row, row + anchorRunRows) >
        PRINTED_LANGUAGE_CODE_ANCHOR_RUN_MIN_INK
    ) {
      anchorRow = row;
      break;
    }
  }
  if (anchorRow < 0) return unknown("noAnchorLine");

  const zoneStart =
    anchorRow - rowsFor(PRINTED_LANGUAGE_CODE_ZONE_START_ABOVE_ANCHOR);
  const zoneEnd =
    anchorRow - rowsFor(PRINTED_LANGUAGE_CODE_ZONE_END_ABOVE_ANCHOR);
  if (
    fractionOf(
      inkRows,
      zoneStart - rowsFor(PRINTED_LANGUAGE_CODE_CLEAR_HEIGHT_ABOVE_ZONE),
      zoneStart,
    ) > PRINTED_LANGUAGE_CODE_CLEAR_MAX_INK
  ) {
    return unknown("busyBackground");
  }

  const zoneInkRows: number[] = [];
  for (let row = Math.max(0, zoneStart); row < zoneEnd; row++) {
    if (inkRows[row]) zoneInkRows.push(row);
  }
  if (zoneInkRows.length <= PRINTED_LANGUAGE_CODE_ABSENT_MAX_INK_ROWS) {
    return { present: false, unknownReason: null, inkExtentRatio: 0 };
  }
  const first = zoneInkRows[0];
  const last = zoneInkRows[zoneInkRows.length - 1];
  const inkExtentRatio =
    (last - first + 1) / PRINTED_LANGUAGE_CODE_SAMPLED_CARD_HEIGHT_PX;
  if (
    inkExtentRatio < PRINTED_LANGUAGE_CODE_MIN_EXTENT ||
    inkExtentRatio > PRINTED_LANGUAGE_CODE_MAX_EXTENT ||
    fractionOf(inkRows, first, last + 1) <= PRINTED_LANGUAGE_CODE_MIN_FILL
  ) {
    return unknown("unexpectedInk", inkExtentRatio);
  }

  const isBorderLine = (column: number) =>
    inkFractions[column] > PRINTED_LANGUAGE_CODE_TEXT_COLUMN_MAX_INK;
  const inkSpan = (fromRow: number, toRow: number) => {
    let left = columns;
    let right = -1;
    for (let row = Math.max(0, fromRow); row < Math.min(rows, toRow); row++) {
      for (let column = 0; column < columns; column++) {
        if (!isBorderLine(column) && isInk(column, row)) {
          left = Math.min(left, column);
          right = Math.max(right, column);
        }
      }
    }
    return { left, right };
  };
  const anchorSpan = inkSpan(anchorRow, anchorRow + anchorRunRows);
  const codeSpan = inkSpan(first, last + 1);
  let strayInk = 0;
  for (let row = Math.max(0, zoneStart); row < zoneEnd; row++) {
    for (let column = 0; column < columns; column++) {
      if (
        !isBorderLine(column) &&
        isInk(column, row) &&
        (column <
          anchorSpan.left - PRINTED_LANGUAGE_CODE_EDGE_TOLERANCE_PX ||
          column > anchorSpan.right + PRINTED_LANGUAGE_CODE_EDGE_TOLERANCE_PX)
      ) {
        strayInk++;
      }
    }
  }
  const tolerance = PRINTED_LANGUAGE_CODE_EDGE_TOLERANCE_PX;
  if (
    strayInk > PRINTED_LANGUAGE_CODE_MAX_STRAY_INK_PX ||
    codeSpan.left < anchorSpan.left - tolerance ||
    codeSpan.right > anchorSpan.right + tolerance ||
    codeSpan.right - codeSpan.left + 1 <
      PRINTED_LANGUAGE_CODE_MIN_WIDTH_OF_ANCHOR *
        (anchorSpan.right - anchorSpan.left + 1)
  ) {
    return unknown("unexpectedInk", inkExtentRatio);
  }
  return { present: true, unknownReason: null, inkExtentRatio };
}

export function detectPrintedLanguageCodeRgba(
  uprightCard: RgbaImage,
  gameKey: string | null | undefined,
): PrintedLanguageCodeDetection | null {
  return detectPrintedLanguageCode(
    uprightCard,
    wholeImageHomography(uprightCard),
    gameKey,
    "upright",
  );
}

export function printedLanguageCodeFormValue(
  printedLanguageCode: boolean | null,
): string | null {
  if (printedLanguageCode === null) return null;
  return printedLanguageCode
    ? PRINTED_LANGUAGE_CODE_PRESENT_FORM_VALUE
    : PRINTED_LANGUAGE_CODE_ABSENT_FORM_VALUE;
}

export function parsePrintedLanguageCodeFormValue(
  value: unknown,
): boolean | null {
  if (value === PRINTED_LANGUAGE_CODE_PRESENT_FORM_VALUE) return true;
  if (value === PRINTED_LANGUAGE_CODE_ABSENT_FORM_VALUE) return false;
  return null;
}
