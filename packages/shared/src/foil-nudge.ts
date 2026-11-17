import {
  FOIL_NUDGE_CHANGE_THRESHOLD,
  FOIL_NUDGE_CHANGED_CELL_MIN_CHANGE,
  FOIL_NUDGE_DIRECTIONS,
  FOIL_NUDGE_GREY_CELL_DETERMINANT,
  FOIL_NUDGE_GRID_COLUMNS,
  FOIL_NUDGE_GRID_ROWS,
  FOIL_NUDGE_INSET_RATIO,
  FOIL_NUDGE_MAX_TRAVEL_FRACTION,
  FOIL_NUDGE_MODULE_NUMBER,
  FOIL_NUDGE_PUSHER_PULSE_OFFSET,
  FOIL_NUDGE_SAMPLES_PER_CELL_SIDE,
} from "./constants/foil-nudge.constant";
import { rotateRgba180 } from "./vision";
import type { FoilDetection } from "./interfaces/foil-detection.interface";
import type {
  FoilNudgeCommands,
  FoilNudgeDirection,
  FoilNudgeFirmwareLimits,
  FoilNudgeMeasurement,
} from "./interfaces/foil-nudge.interface";
import type { ServoCalibration } from "./interfaces/module-configs.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";

export function parseFoilNudgeFirmwareLimits(
  status: Record<string, unknown> | null | undefined,
): FoilNudgeFirmwareLimits | null {
  const maxPulse = status?.pusherNudgeMaxPulse;
  const maxTravelPercent = status?.pusherNudgeMaxTravelPercent;
  if (typeof maxPulse !== "number" || typeof maxTravelPercent !== "number") return null;
  if (maxPulse <= 0 || maxTravelPercent <= 0) return null;
  return { maxPulse, maxTravelPercent };
}

export function foilNudgePusherPulse(
  calibration: ServoCalibration,
  firmwareLimits: FoilNudgeFirmwareLimits,
  direction: FoilNudgeDirection,
): number | null {
  const sidePulse = direction === "left" ? calibration.pusherLeft : calibration.pusherRight;
  const travel = sidePulse - calibration.pusherNeutral;
  const offset = Math.floor(
    Math.min(
      FOIL_NUDGE_PUSHER_PULSE_OFFSET,
      firmwareLimits.maxPulse,
      Math.abs(travel) *
        Math.min(FOIL_NUDGE_MAX_TRAVEL_FRACTION, firmwareLimits.maxTravelPercent / 100),
    ),
  );
  if (offset < 1) return null;
  return calibration.pusherNeutral + Math.sign(travel) * offset;
}

export function foilNudgeCommands(
  calibration: ServoCalibration,
  firmwareLimits: FoilNudgeFirmwareLimits,
): FoilNudgeCommands | null {
  const nudges = FOIL_NUDGE_DIRECTIONS.flatMap((direction) => {
    const pulse = foilNudgePusherPulse(calibration, firmwareLimits, direction);
    return pulse === null
      ? []
      : [{ direction, command: { servo: "pusher", module: FOIL_NUDGE_MODULE_NUMBER, value: pulse } }];
  });
  if (nudges.length === 0) return null;
  return {
    nudges,
    restorePusher: {
      servo: "pusher",
      module: FOIL_NUDGE_MODULE_NUMBER,
      position: "neutral",
    },
  };
}

export function isFoilNudgeReplyOk(line: string): boolean {
  try {
    return (JSON.parse(line) as { status?: unknown }).status === "ok";
  } catch {
    return false;
  }
}

function cellMeans(image: RgbaImage): Float64Array {
  const [redOffset, greenOffset, blueOffset] =
    image.channelOrder === "bgra" ? [2, 1, 0] : [0, 1, 2];
  const left = image.width * FOIL_NUDGE_INSET_RATIO;
  const top = image.height * FOIL_NUDGE_INSET_RATIO;
  const cellWidth = (image.width * (1 - 2 * FOIL_NUDGE_INSET_RATIO)) / FOIL_NUDGE_GRID_COLUMNS;
  const cellHeight = (image.height * (1 - 2 * FOIL_NUDGE_INSET_RATIO)) / FOIL_NUDGE_GRID_ROWS;
  const samples = FOIL_NUDGE_SAMPLES_PER_CELL_SIDE;
  const means = new Float64Array(FOIL_NUDGE_GRID_COLUMNS * FOIL_NUDGE_GRID_ROWS * 3);
  for (let row = 0; row < FOIL_NUDGE_GRID_ROWS; row++) {
    for (let column = 0; column < FOIL_NUDGE_GRID_COLUMNS; column++) {
      const cell = (row * FOIL_NUDGE_GRID_COLUMNS + column) * 3;
      for (let sampleY = 0; sampleY < samples; sampleY++) {
        const y = Math.min(
          image.height - 1,
          Math.floor(top + (row + (sampleY + 0.5) / samples) * cellHeight),
        );
        for (let sampleX = 0; sampleX < samples; sampleX++) {
          const x = Math.min(
            image.width - 1,
            Math.floor(left + (column + (sampleX + 0.5) / samples) * cellWidth),
          );
          const offset = (y * image.width + x) * 4;
          means[cell] += image.data[offset + redOffset];
          means[cell + 1] += image.data[offset + greenOffset];
          means[cell + 2] += image.data[offset + blueOffset];
        }
      }
      for (let channel = 0; channel < 3; channel++) means[cell + channel] /= samples * samples;
    }
  }
  return means;
}

function normalizeByChannelMeans(means: Float64Array): Float64Array {
  const channelTotals = [0, 0, 0];
  for (let index = 0; index < means.length; index++) channelTotals[index % 3] += means[index];
  const cellCount = means.length / 3;
  const normalized = new Float64Array(means.length);
  for (let index = 0; index < means.length; index++) {
    normalized[index] = means[index] / Math.max(1, channelTotals[index % 3] / cellCount);
  }
  return normalized;
}

function colourChangeUnexplainedByBrightnessAndGlare(
  before: Float64Array,
  after: Float64Array,
  cell: number,
): number {
  const x = [0, 1, 2].map((channel) => before[cell * 3 + channel] / 255);
  const y = [0, 1, 2].map((channel) => after[cell * 3 + channel] / 255);
  const sumX = x[0] + x[1] + x[2];
  const sumY = y[0] + y[1] + y[2];
  const sumXX = x[0] * x[0] + x[1] * x[1] + x[2] * x[2];
  const sumXY = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const determinant = 3 * sumXX - sumX * sumX;
  const isGrey = Math.abs(determinant) < FOIL_NUDGE_GREY_CELL_DETERMINANT;
  const brightnessScale = isGrey ? 0 : (3 * sumXY - sumX * sumY) / determinant;
  const addedWhite = isGrey ? sumY / 3 : (sumXX * sumY - sumX * sumXY) / determinant;
  const squaredResidual = y.reduce(
    (total, value, channel) => total + (value - brightnessScale * x[channel] - addedWhite) ** 2,
    0,
  );
  return Math.sqrt(squaredResidual / 3);
}

export function measureFoilNudgeChange(
  before: RgbaImage,
  after: RgbaImage,
): FoilNudgeMeasurement {
  const beforeMeans = cellMeans(before);
  const afterMeans = cellMeans(after);
  const beforeCells = normalizeByChannelMeans(beforeMeans);
  const afterCells = normalizeByChannelMeans(afterMeans);
  const cellCount = beforeCells.length / 3;
  let changeSum = 0;
  let changedCells = 0;
  let maxCellChange = 0;
  let colourOnlyChangeSum = 0;
  for (let cell = 0; cell < cellCount; cell++) {
    colourOnlyChangeSum += colourChangeUnexplainedByBrightnessAndGlare(beforeMeans, afterMeans, cell);
    let change = 0;
    for (let channel = 0; channel < 3; channel++) {
      change += Math.abs(afterCells[cell * 3 + channel] - beforeCells[cell * 3 + channel]);
    }
    change /= 3;
    changeSum += change;
    if (change >= FOIL_NUDGE_CHANGED_CELL_MIN_CHANGE) changedCells++;
    maxCellChange = Math.max(maxCellChange, change);
  }
  return {
    meanCellChange: changeSum / cellCount,
    changedCellShare: changedCells / cellCount,
    maxCellChange,
    colourOnlyChange: colourOnlyChangeSum / cellCount,
  };
}

export function measureAlignedFoilNudgeChange(
  before: RgbaImage,
  after: RgbaImage,
): FoilNudgeMeasurement {
  const asCaptured = measureFoilNudgeChange(before, after);
  const turnedAround = measureFoilNudgeChange(before, rotateRgba180(after));
  return turnedAround.meanCellChange < asCaptured.meanCellChange ? turnedAround : asCaptured;
}

export function detectFoilFromNudges(
  before: RgbaImage,
  afterByDirection: Partial<Record<FoilNudgeDirection, RgbaImage>>,
): FoilDetection | null {
  const nudgeChangesByDirection: Partial<Record<FoilNudgeDirection, FoilNudgeMeasurement>> = {};
  for (const direction of FOIL_NUDGE_DIRECTIONS) {
    const after = afterByDirection[direction];
    if (after) nudgeChangesByDirection[direction] = measureAlignedFoilNudgeChange(before, after);
  }
  const strongest = Object.values(nudgeChangesByDirection).reduce<FoilNudgeMeasurement | null>(
    (best, change) => (!best || change.meanCellChange > best.meanCellChange ? change : best),
    null,
  );
  if (!strongest) return null;
  return {
    method: "nudge",
    foilScore: strongest.meanCellChange,
    isFoilDetected: strongest.meanCellChange >= FOIL_NUDGE_CHANGE_THRESHOLD,
    nudgeChange: strongest,
    nudgeChangesByDirection,
  };
}
