import {
  OCR_CALIBRATION_BODY_WORD_MIN_LENGTH,
  OCR_CALIBRATION_NAME_MIN_HEIGHT_RATIO,
  OCR_CALIBRATION_NAME_MIN_SIMILARITY,
  OCR_CALIBRATION_NAME_SCORE_TOLERANCE,
  OCR_CALIBRATION_NAME_SPAN_SLACK,
  OCR_CALIBRATION_NEXT_LINE_MAX_GAP,
  OCR_CALIBRATION_NUMBER_MIN_DIGITS,
  OCR_CALIBRATION_SAME_SPOT_MIN_IOU,
  OCR_CALIBRATION_SEPARATOR_PATTERN,
  OCR_CALIBRATION_SET_CODE_MIN_LENGTH,
} from "../constants/ocr-calibration";
import type {
  OcrBox,
  OcrCalibrationTarget,
  OcrCardObservations,
  OcrFieldObservation,
  OcrPageLine,
  OcrPageWord,
} from "../interfaces/ocr-calibration";

export function normalizeCalibrationText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function textSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return 1 - previous[b.length] / longest;
}

export function unionBoxes(boxes: OcrBox[]): OcrBox {
  return {
    x0: Math.min(...boxes.map((box) => box.x0)),
    y0: Math.min(...boxes.map((box) => box.y0)),
    x1: Math.max(...boxes.map((box) => box.x1)),
    y1: Math.max(...boxes.map((box) => box.y1)),
  };
}

function boxArea(box: OcrBox): number {
  return (box.x1 - box.x0) * (box.y1 - box.y0);
}

export function boxIou(a: OcrBox, b: OcrBox): number {
  const width = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const height = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (width <= 0 || height <= 0) return 0;
  const intersection = width * height;
  return intersection / (boxArea(a) + boxArea(b) - intersection);
}

function allSameSpot(boxes: OcrBox[]): boolean {
  return boxes.every(
    (box) => boxIou(box, boxes[0]) >= OCR_CALIBRATION_SAME_SPOT_MIN_IOU,
  );
}

function overlapsHorizontally(a: OcrBox, b: OcrBox): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1;
}

function nextLineBelow(
  line: OcrPageLine,
  lines: OcrPageLine[],
): OcrPageLine | null {
  const height = line.box.y1 - line.box.y0;
  const below = lines
    .filter(
      (other) =>
        other !== line &&
        other.box.y0 >= line.box.y1 - height / 2 &&
        other.box.y0 - line.box.y1 <= height * OCR_CALIBRATION_NEXT_LINE_MAX_GAP &&
        overlapsHorizontally(line.box, other.box),
    )
    .sort((a, b) => a.box.y0 - b.box.y0);
  return below[0] ?? null;
}

function wordSequences(lines: OcrPageLine[]): OcrPageWord[][][] {
  return lines.flatMap((line) => {
    const next = nextLineBelow(line, lines);
    const single = [line.words];
    return next ? [single, [line.words, next.words]] : [single];
  });
}

function textHeight(words: OcrPageWord[]): number {
  const heights = words
    .map(({ box }) => box.y1 - box.y0)
    .sort((a, b) => a - b);
  return heights[Math.floor((heights.length - 1) / 2)];
}

function spanHeight(
  span: { word: OcrPageWord; lineIndex: number }[],
): number {
  const lineIndexes = [...new Set(span.map(({ lineIndex }) => lineIndex))];
  return Math.max(
    ...lineIndexes.map((lineIndex) =>
      textHeight(
        span
          .filter((entry) => entry.lineIndex === lineIndex)
          .map(({ word }) => word),
      ),
    ),
  );
}

export function findNameObservation(
  lines: OcrPageLine[],
  name: string,
): OcrFieldObservation | null {
  const target = normalizeCalibrationText(name);
  if (!target) return null;
  const targetWords = target.split(" ").length;
  const maxSpan = targetWords + OCR_CALIBRATION_NAME_SPAN_SLACK;
  const matches: {
    score: number;
    height: number;
    observation: OcrFieldObservation;
  }[] = [];

  for (const sequence of wordSequences(lines)) {
    const words = sequence.flatMap((lineWords, lineIndex) =>
      lineWords
        .filter(({ text }) => normalizeCalibrationText(text))
        .map((word) => ({ word, lineIndex })),
    );
    for (let start = 0; start < words.length; start++) {
      for (
        let end = start + 1;
        end <= Math.min(words.length, start + maxSpan);
        end++
      ) {
        const span = words.slice(start, end);
        const spanWords = span.map(({ word }) => word);
        const score = textSimilarity(
          normalizeCalibrationText(spanWords.map(({ text }) => text).join(" ")),
          target,
        );
        if (score < OCR_CALIBRATION_NAME_MIN_SIMILARITY) continue;
        matches.push({
          score,
          height: spanHeight(span),
          observation: {
            box: unionBoxes(spanWords.map(({ box }) => box)),
            lineCount: new Set(span.map(({ lineIndex }) => lineIndex)).size,
          },
        });
      }
    }
  }
  const bodyWords = lines
    .flatMap((line) => line.words)
    .filter(
      ({ text }) =>
        normalizeCalibrationText(text).replace(/ /g, "").length >=
        OCR_CALIBRATION_BODY_WORD_MIN_LENGTH,
    );
  const bodyHeight = bodyWords.length > 0 ? textHeight(bodyWords) : 0;
  const headings = matches.filter(
    ({ height }) => height >= bodyHeight * OCR_CALIBRATION_NAME_MIN_HEIGHT_RATIO,
  );
  if (headings.length === 0) return null;

  const bestScore = Math.max(...headings.map(({ score }) => score));
  const contenders = headings.filter(
    ({ score }) => score >= bestScore - OCR_CALIBRATION_NAME_SCORE_TOLERANCE,
  );
  const [spot] = [...contenders].sort((a, b) => b.height - a.height);
  const [winner] = contenders
    .filter(
      ({ observation }) => boxIou(observation.box, spot.observation.box) > 0,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.observation.lineCount - b.observation.lineCount ||
        boxArea(a.observation.box) - boxArea(b.observation.box),
    );
  return winner.observation;
}

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

function wordDigitRuns(text: string): string[] {
  return (text.replace(/\/\s*\d+$/, "").match(/\d+/g) ?? []).map(
    stripLeadingZeros,
  );
}

function containsSetCode(text: string, setCode: string): boolean {
  return (
    setCode.length >= OCR_CALIBRATION_SET_CODE_MIN_LENGTH &&
    normalizeCalibrationText(text).replace(/ /g, "").includes(setCode)
  );
}

export function findNumberObservation(
  lines: OcrPageLine[],
  collectorNumber: string,
  setCode: string,
): OcrFieldObservation | null {
  const digits = stripLeadingZeros(collectorNumber.replace(/\D+/g, ""));
  if (digits.length < OCR_CALIBRATION_NUMBER_MIN_DIGITS) return null;
  const code = normalizeCalibrationText(setCode).replace(/ /g, "");

  const scored = lines.flatMap((line) =>
    line.words
      .filter((word) => wordDigitRuns(word.text).includes(digits))
      .map((word) => ({
        word,
        score:
          (containsSetCode(word.text, code) ? 2 : 0) +
          (OCR_CALIBRATION_SEPARATOR_PATTERN.test(word.text) ? 1 : 0),
      })),
  );
  if (scored.length === 0) return null;
  const top = Math.max(...scored.map(({ score }) => score));
  const winners = scored.filter(({ score }) => score === top);
  if (!allSameSpot(winners.map(({ word }) => word.box))) return null;
  return { box: winners[0].word.box, lineCount: 1 };
}

function lineContaining(
  lines: OcrPageLine[],
  box: OcrBox,
): OcrPageLine | null {
  return (
    lines.find((line) =>
      line.words.some(
        (word) =>
          word.box.x0 === box.x0 &&
          word.box.y0 === box.y0 &&
          word.box.x1 === box.x1 &&
          word.box.y1 === box.y1,
      ),
    ) ?? null
  );
}

function adjacentLines(a: OcrPageLine, b: OcrPageLine): boolean {
  if (a === b) return true;
  const [upper, lower] = a.box.y0 <= b.box.y0 ? [a, b] : [b, a];
  const height = upper.box.y1 - upper.box.y0;
  return (
    overlapsHorizontally(upper.box, lower.box) &&
    lower.box.y0 - upper.box.y1 <= height * OCR_CALIBRATION_NEXT_LINE_MAX_GAP
  );
}

export function findSetLineObservation(
  lines: OcrPageLine[],
  setCode: string,
  number: OcrFieldObservation | null,
): OcrFieldObservation | null {
  const code = normalizeCalibrationText(setCode).replace(/ /g, "");
  const candidates = lines.filter((line) =>
    line.words.some((word) => containsSetCode(word.text, code)),
  );
  if (
    candidates.length === 0 ||
    !allSameSpot(candidates.map((line) => line.box))
  ) {
    return null;
  }
  const setLine = candidates[0];
  const numberLine = number ? lineContaining(lines, number.box) : null;
  const joined =
    numberLine && adjacentLines(setLine, numberLine)
      ? [setLine, numberLine]
      : [setLine];
  const unique = [...new Set(joined)];
  return {
    box: unionBoxes(unique.flatMap((line) => line.words.map((word) => word.box))),
    lineCount: unique.length,
  };
}

export function observeCard(
  lines: OcrPageLine[],
  target: OcrCalibrationTarget,
): OcrCardObservations {
  const name = findNameObservation(lines, target.name);
  const number = findNumberObservation(
    lines,
    target.collectorNumber,
    target.setCode,
  );
  const setLine = findSetLineObservation(lines, target.setCode, number);
  return {
    ...(name ? { name } : {}),
    ...(number ? { number } : {}),
    ...(setLine ? { setLine } : {}),
  };
}
