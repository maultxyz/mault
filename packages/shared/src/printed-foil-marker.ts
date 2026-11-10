import {
  PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY,
  PRINTED_FOIL_MARKER_DOT_MAX_HEIGHT_RATIO,
  PRINTED_FOIL_MARKER_DOT_MAX_WIDTH_RATIO,
  PRINTED_FOIL_MARKER_LANGUAGE_GAP_RATIO,
  PRINTED_FOIL_MARKER_LINE_MIN_VERTICAL_OVERLAP,
  PRINTED_FOIL_MARKER_MAX_LINE_HEIGHT,
  PRINTED_FOIL_MARKER_MIN_COMPONENT_AREA_PX,
  PRINTED_FOIL_MARKER_MIN_LINE_HEIGHT_PX,
  PRINTED_FOIL_MARKER_MIN_SET_CODE_GLYPHS,
  PRINTED_FOIL_MARKER_SPLIT_GLYPH_MAX_GAP_PX,
  PRINTED_FOIL_MARKER_SPLIT_GLYPH_MAX_JOINED_WIDTH_RATIO,
  PRINTED_FOIL_MARKER_SPLIT_GLYPH_MAX_PIECE_WIDTH_RATIO,
  PRINTED_FOIL_MARKER_STAR_GRID_SIZE,
  PRINTED_FOIL_MARKER_STAR_MAX_WIDTH_RATIO,
  PRINTED_FOIL_MARKER_STAR_MIN_HEIGHT_RATIO,
  PRINTED_FOIL_MARKER_STAR_MIN_SHAPE_SCORE,
  PRINTED_FOIL_MARKER_TEXT_CONTRAST,
} from "./constants/printed-foil-marker.constant";
import type {
  PrintedFoilMarker,
  PrintedFoilMarkerDetection,
  TextComponent,
} from "./interfaces/printed-foil-marker.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";

const NOT_FOUND: PrintedFoilMarkerDetection = {
  marker: null,
  glyphHeightRatio: null,
  glyphWidthRatio: null,
  starShapeScore: null,
};

function luminanceAt(image: RgbaImage, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  const [red, green, blue] =
    image.channelOrder === "bgra"
      ? [image.data[offset + 2], image.data[offset + 1], image.data[offset]]
      : [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
  return 0.299 * red + 0.587 * green + 0.114 * blue;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function componentsIn(
  isText: (x: number, y: number) => boolean,
  width: number,
  height: number,
): TextComponent[] {
  const seen = new Uint8Array(width * height);
  const components: TextComponent[] = [];
  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      const startKey = startY * width + startX;
      if (seen[startKey] || !isText(startX, startY)) continue;
      seen[startKey] = 1;
      const pixels: [number, number][] = [];
      const stack: [number, number][] = [[startX, startY]];
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        pixels.push([x, y]);
        for (const [nx, ny] of [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ]) {
          const key = ny * width + nx;
          if (
            nx >= 0 &&
            nx < width &&
            ny >= 0 &&
            ny < height &&
            !seen[key] &&
            isText(nx, ny)
          ) {
            seen[key] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (pixels.length < PRINTED_FOIL_MARKER_MIN_COMPONENT_AREA_PX) continue;
      components.push({
        left: Math.min(...pixels.map(([x]) => x)),
        right: Math.max(...pixels.map(([x]) => x)) + 1,
        top: Math.min(...pixels.map(([, y]) => y)),
        bottom: Math.max(...pixels.map(([, y]) => y)) + 1,
        pixels,
      });
    }
  }
  return components;
}

function sharesTextLine(
  component: TextComponent,
  line: { top: number; bottom: number },
): boolean {
  const overlap =
    Math.min(component.bottom, line.bottom) - Math.max(component.top, line.top);
  const shorter = Math.min(
    component.bottom - component.top,
    line.bottom - line.top,
  );
  return overlap >= PRINTED_FOIL_MARKER_LINE_MIN_VERTICAL_OVERLAP * shorter;
}

function textLinesOf(components: TextComponent[]): TextComponent[][] {
  const lines: { top: number; bottom: number; glyphs: TextComponent[] }[] = [];
  const byCenter = [...components].sort(
    (a, b) => a.top + a.bottom - (b.top + b.bottom),
  );
  for (const component of byCenter) {
    const line = lines.find((candidate) => sharesTextLine(component, candidate));
    if (line) {
      line.top = Math.min(line.top, component.top);
      line.bottom = Math.max(line.bottom, component.bottom);
      line.glyphs.push(component);
    } else {
      lines.push({
        top: component.top,
        bottom: component.bottom,
        glyphs: [component],
      });
    }
  }
  return lines.map((line) => line.glyphs);
}

function mergeOverlappingColumns(components: TextComponent[]): TextComponent[] {
  const merged: TextComponent[] = [];
  for (const component of components) {
    const last = merged[merged.length - 1];
    if (last && component.left < last.right) {
      last.right = Math.max(last.right, component.right);
      last.top = Math.min(last.top, component.top);
      last.bottom = Math.max(last.bottom, component.bottom);
      last.pixels.push(...component.pixels);
    } else {
      merged.push({ ...component, pixels: [...component.pixels] });
    }
  }
  return merged;
}

function joinSplitGlyphs(
  glyphs: TextComponent[],
  lineHeight: number,
): TextComponent[] {
  const widthOf = (glyph: TextComponent) => glyph.right - glyph.left;
  const isFragment = (glyph: TextComponent) =>
    widthOf(glyph) <=
    PRINTED_FOIL_MARKER_SPLIT_GLYPH_MAX_PIECE_WIDTH_RATIO * lineHeight;
  const joined: TextComponent[] = [];
  for (const glyph of glyphs) {
    const last = joined[joined.length - 1];
    if (
      last &&
      isFragment(last) &&
      isFragment(glyph) &&
      glyph.left - last.right <= PRINTED_FOIL_MARKER_SPLIT_GLYPH_MAX_GAP_PX &&
      glyph.right - last.left <=
        PRINTED_FOIL_MARKER_SPLIT_GLYPH_MAX_JOINED_WIDTH_RATIO * lineHeight
    ) {
      joined[joined.length - 1] = {
        left: last.left,
        right: glyph.right,
        top: Math.min(last.top, glyph.top),
        bottom: Math.max(last.bottom, glyph.bottom),
        pixels: [...last.pixels, ...glyph.pixels],
      };
    } else {
      joined.push(glyph);
    }
  }
  return joined;
}

function starMask(size: number): number[] {
  const center = (size - 1) / 2;
  const outer = size / 2;
  const inner = outer * 0.45;
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outer : inner;
    return [
      center + radius * Math.cos(angle),
      center + radius * Math.sin(angle),
    ];
  });
  const inside = (x: number, y: number) => {
    let isInside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        isInside = !isInside;
      }
    }
    return isInside;
  };
  const mask: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) mask.push(inside(x, y) ? 1 : 0);
  }
  return mask;
}

const STAR_MASK = starMask(PRINTED_FOIL_MARKER_STAR_GRID_SIZE);

function shapeGrid(component: TextComponent): number[] {
  const size = PRINTED_FOIL_MARKER_STAR_GRID_SIZE;
  const counts = new Array<number>(size * size).fill(0);
  const totals = new Array<number>(size * size).fill(0);
  const width = component.right - component.left;
  const height = component.bottom - component.top;
  for (let y = component.top; y < component.bottom; y++) {
    for (let x = component.left; x < component.right; x++) {
      const cell =
        Math.min(size - 1, Math.floor(((y - component.top) / height) * size)) *
          size +
        Math.min(size - 1, Math.floor(((x - component.left) / width) * size));
      totals[cell]++;
    }
  }
  for (const [x, y] of component.pixels) {
    const cell =
      Math.min(size - 1, Math.floor(((y - component.top) / height) * size)) *
        size +
      Math.min(size - 1, Math.floor(((x - component.left) / width) * size));
    counts[cell]++;
  }
  return counts.map((count, cell) =>
    totals[cell] > 0 ? count / totals[cell] : 0,
  );
}

function correlation(a: number[], b: number[]): number {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < a.length; i++) {
    covariance += (a[i] - meanA) * (b[i] - meanB);
    varianceA += (a[i] - meanA) ** 2;
    varianceB += (b[i] - meanB) ** 2;
  }
  return varianceA === 0 || varianceB === 0
    ? 0
    : covariance / Math.sqrt(varianceA * varianceB);
}

function classify(
  heightRatio: number,
  widthRatio: number,
  starShapeScore: number,
): PrintedFoilMarker | null {
  if (
    heightRatio <= PRINTED_FOIL_MARKER_DOT_MAX_HEIGHT_RATIO &&
    widthRatio <= PRINTED_FOIL_MARKER_DOT_MAX_WIDTH_RATIO
  ) {
    return "dot";
  }
  if (
    heightRatio >= PRINTED_FOIL_MARKER_STAR_MIN_HEIGHT_RATIO &&
    widthRatio <= PRINTED_FOIL_MARKER_STAR_MAX_WIDTH_RATIO &&
    starShapeScore >= PRINTED_FOIL_MARKER_STAR_MIN_SHAPE_SCORE
  ) {
    return "star";
  }
  return null;
}

export function detectPrintedFoilMarkerRgba(
  image: RgbaImage,
  gameKey: string | null | undefined,
): PrintedFoilMarkerDetection {
  const band = gameKey ? PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY[gameKey] : null;
  if (!band) return NOT_FOUND;
  const left = Math.round(band.x * image.width);
  const top = Math.round(band.y * image.height);
  const width = Math.min(
    image.width - left,
    Math.round(band.width * image.width),
  );
  const height = Math.min(
    image.height - top,
    Math.round(band.height * image.height),
  );
  if (width <= 0 || height <= 0) return NOT_FOUND;

  const luminance: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      luminance.push(luminanceAt(image, left + x, top + y));
    }
  }
  const background = median(luminance);
  const textMask = luminance.map(
    (value) =>
      Math.abs(value - background) >= PRINTED_FOIL_MARKER_TEXT_CONTRAST,
  );
  const isText = (x: number, y: number) => textMask[y * width + x];

  const maxLineHeight = PRINTED_FOIL_MARKER_MAX_LINE_HEIGHT * image.height;
  const minGlyphs = PRINTED_FOIL_MARKER_MIN_SET_CODE_GLYPHS + 3;
  const lines = textLinesOf(componentsIn(isText, width, height))
    .map((line) => mergeOverlappingColumns(line.sort((a, b) => a.left - b.left)))
    .filter((line) => {
      if (line.length < minGlyphs) return false;
      const lineHeight = median(line.map((glyph) => glyph.bottom - glyph.top));
      return (
        lineHeight >= PRINTED_FOIL_MARKER_MIN_LINE_HEIGHT_PX &&
        lineHeight <= maxLineHeight
      );
    });
  const setLine = lines[lines.length - 1];
  if (!setLine) return NOT_FOUND;
  const lineHeight = median(setLine.map((glyph) => glyph.bottom - glyph.top));
  const glyphs = joinSplitGlyphs(setLine, lineHeight);

  const languageGap = lineHeight * PRINTED_FOIL_MARKER_LANGUAGE_GAP_RATIO;
  const languageEnd = glyphs.findIndex(
    (glyph, index) =>
      index >= PRINTED_FOIL_MARKER_MIN_SET_CODE_GLYPHS + 2 &&
      (glyphs[index + 1]?.left ?? width) - glyph.right >= languageGap,
  );
  if (languageEnd < 0) return NOT_FOUND;
  const marker = glyphs[languageEnd - 2];

  const glyphHeightRatio = (marker.bottom - marker.top) / lineHeight;
  const glyphWidthRatio = (marker.right - marker.left) / lineHeight;
  const starShapeScore = correlation(shapeGrid(marker), STAR_MASK);
  return {
    marker: classify(glyphHeightRatio, glyphWidthRatio, starShapeScore),
    glyphHeightRatio,
    glyphWidthRatio,
    starShapeScore,
  };
}
