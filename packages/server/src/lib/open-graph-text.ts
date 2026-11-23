import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import opentype, { type Font } from "opentype.js";
import {
  OPEN_GRAPH_BOLD_FONT_FILE,
  OPEN_GRAPH_ELLIPSIS,
  OPEN_GRAPH_FONT_DIRECTORY,
  OPEN_GRAPH_MEDIUM_FONT_FILE,
} from "./constants/open-graph-image";
import type { OpenGraphTextBlock } from "./interfaces/open-graph-image";

export function findServerAssetPath(relativePath: string): string {
  let directory = __dirname;
  while (!existsSync(join(directory, relativePath))) {
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`Server asset not found: ${relativePath}`);
    }
    directory = parent;
  }
  return join(directory, relativePath);
}

function loadFont(fileName: string): Font {
  const file = readFileSync(findServerAssetPath(join(OPEN_GRAPH_FONT_DIRECTORY, fileName)));
  return opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
}

let loadedFonts: { bold: Font; medium: Font } | null = null;

export function openGraphFonts(): { bold: Font; medium: Font } {
  loadedFonts ??= {
    bold: loadFont(OPEN_GRAPH_BOLD_FONT_FILE),
    medium: loadFont(OPEN_GRAPH_MEDIUM_FONT_FILE),
  };
  return loadedFonts;
}

export function withDrawableCharacters(font: Font, text: string): string {
  return Array.from(text.normalize("NFC"))
    .map((character) => (/\s/.test(character) ? " " : character))
    .filter((character) => character === " " || font.charToGlyphIndex(character) > 0)
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
}

function widthOf(font: Font, text: string, fontSize: number): number {
  return font.getAdvanceWidth(text, fontSize);
}

function withEllipsis(font: Font, text: string, fontSize: number, maxWidth: number): string {
  let shortened = text;
  while (shortened.length > 0 && widthOf(font, `${shortened}${OPEN_GRAPH_ELLIPSIS}`, fontSize) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trimEnd()}${OPEN_GRAPH_ELLIPSIS}`;
}

function splitLongWord(font: Font, word: string, fontSize: number, maxWidth: number): string[] {
  const pieces: string[] = [];
  let piece = "";
  for (const character of Array.from(word)) {
    if (piece && widthOf(font, piece + character, fontSize) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece += character;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

export function wrapText(
  font: Font,
  text: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ").filter(Boolean)) {
    const pieces =
      widthOf(font, word, fontSize) > maxWidth
        ? splitLongWord(font, word, fontSize, maxWidth)
        : [word];
    for (const piece of pieces) {
      const candidate = line ? `${line} ${piece}` : piece;
      if (line && widthOf(font, candidate, fontSize) > maxWidth) {
        lines.push(line);
        line = piece;
      } else {
        line = candidate;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function fitTextBlock(
  font: Font,
  text: string,
  fontSizes: number[],
  maxWidth: number,
  maxLines: number,
): OpenGraphTextBlock {
  for (const fontSize of fontSizes) {
    const lines = wrapText(font, text, fontSize, maxWidth);
    if (lines.length <= maxLines) return { lines, fontSize };
  }
  const fontSize = fontSizes[fontSizes.length - 1];
  const lines = wrapText(font, text, fontSize, maxWidth);
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = withEllipsis(font, lines.slice(maxLines - 1).join(" "), fontSize, maxWidth);
  return { lines: kept, fontSize };
}

export function textPathData(
  font: Font,
  text: string,
  left: number,
  baseline: number,
  fontSize: number,
): string {
  return font.getPath(text, left, baseline, fontSize).toPathData(2);
}
