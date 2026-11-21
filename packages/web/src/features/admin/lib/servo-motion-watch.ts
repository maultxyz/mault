import {
  KIT_WATCH_CHANGED_PIXEL_MIN_DIFFERENCE,
  KIT_WATCH_MIN_BOX_FRACTION,
  KIT_WATCH_MIN_CHANGED_PIXELS,
  KIT_WATCH_MIN_PATCH_CONTRAST,
  KIT_WATCH_MIN_MOVEMENT_PERCENT,
  KIT_WATCH_MISSES_TO_STOP,
  KIT_WATCH_PATCH_MAX_SIDE,
  KIT_WATCH_PATCH_MIN_SIDE,
  KIT_WATCH_REFERENCE_ADAPT_RATE,
} from "@/lib/constants/kit-test";
import type {
  KitServoStressTarget,
  KitWatchBox,
  KitWatchChannelState,
  KitWatchDiscriminator,
  KitWatchSettledResult,
} from "@/lib/interfaces/kit-test";

export function createWatchChannelState(): KitWatchChannelState {
  return {
    status: "learning",
    references: {},
    discriminator: null,
    previousPatch: null,
    consecutiveMisses: 0,
    lastMovementPercent: null,
  };
}

export function normalizeLuminancePatch(
  rgba: Uint8ClampedArray,
): Float32Array | null {
  const pixelCount = rgba.length / 4;
  const luminance = new Float32Array(pixelCount);
  let sum = 0;
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const offset = pixel * 4;
    const value =
      0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2];
    luminance[pixel] = value;
    sum += value;
  }
  const mean = sum / pixelCount;
  let squaredSum = 0;
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    luminance[pixel] -= mean;
    squaredSum += luminance[pixel] * luminance[pixel];
  }
  const standardDeviation = Math.sqrt(squaredSum / pixelCount);
  if (standardDeviation < KIT_WATCH_MIN_PATCH_CONTRAST) return null;
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    luminance[pixel] /= standardDeviation;
  }
  return luminance;
}

export function watchPatchSize(boxPixelWidth: number, boxPixelHeight: number) {
  const scale = KIT_WATCH_PATCH_MAX_SIDE / Math.max(boxPixelWidth, boxPixelHeight);
  return {
    width: Math.max(KIT_WATCH_PATCH_MIN_SIDE, Math.round(boxPixelWidth * scale)),
    height: Math.max(KIT_WATCH_PATCH_MIN_SIDE, Math.round(boxPixelHeight * scale)),
  };
}

export function samplePatch(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  box: KitWatchBox,
  scratchCanvas: HTMLCanvasElement,
): Float32Array | null {
  if (!sourceWidth || !sourceHeight) return null;
  const boxPixelWidth = box.width * sourceWidth;
  const boxPixelHeight = box.height * sourceHeight;
  const { width, height } = watchPatchSize(boxPixelWidth, boxPixelHeight);
  scratchCanvas.width = width;
  scratchCanvas.height = height;
  const context = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(
    source,
    box.x * sourceWidth,
    box.y * sourceHeight,
    boxPixelWidth,
    boxPixelHeight,
    0,
    0,
    width,
    height,
  );
  return normalizeLuminancePatch(context.getImageData(0, 0, width, height).data);
}

export function buildDiscriminator(
  minReference: Float32Array,
  maxReference: Float32Array,
): KitWatchDiscriminator | null {
  if (minReference.length !== maxReference.length) return null;
  const changedPixels: number[] = [];
  for (let pixel = 0; pixel < minReference.length; pixel++) {
    if (
      Math.abs(maxReference[pixel] - minReference[pixel]) >=
      KIT_WATCH_CHANGED_PIXEL_MIN_DIFFERENCE
    ) {
      changedPixels.push(pixel);
    }
  }
  if (changedPixels.length < KIT_WATCH_MIN_CHANGED_PIXELS) return null;
  const midpoint = new Float32Array(changedPixels.length);
  const maxMinusMin = new Float32Array(changedPixels.length);
  let energy = 0;
  changedPixels.forEach((pixel, index) => {
    midpoint[index] = (maxReference[pixel] + minReference[pixel]) / 2;
    maxMinusMin[index] = maxReference[pixel] - minReference[pixel];
    energy += maxMinusMin[index] * maxMinusMin[index];
  });
  return {
    changedPixelIndices: Uint32Array.from(changedPixels),
    midpoint,
    maxMinusMin,
    halfEnergy: energy / 2,
  };
}

export function movementPercent(
  patch: Float32Array,
  previousPatch: Float32Array,
  discriminator: KitWatchDiscriminator,
): number {
  let changeEnergy = 0;
  for (const pixel of discriminator.changedPixelIndices) {
    const change = patch[pixel] - previousPatch[pixel];
    changeEnergy += change * change;
  }
  return Math.round(Math.sqrt(changeEnergy / (discriminator.halfEnergy * 2)) * 100);
}

function blendReference(reference: Float32Array, patch: Float32Array) {
  const blended = new Float32Array(reference.length);
  for (let pixel = 0; pixel < reference.length; pixel++) {
    blended[pixel] =
      reference[pixel] * (1 - KIT_WATCH_REFERENCE_ADAPT_RATE) +
      patch[pixel] * KIT_WATCH_REFERENCE_ADAPT_RATE;
  }
  return blended;
}

export function recordSettledPatch(
  state: KitWatchChannelState,
  target: KitServoStressTarget,
  patch: Float32Array | null,
): KitWatchSettledResult {
  if (state.status === "noMotion") return { state, isStopped: false };

  if (state.status === "learning") {
    if (!patch) {
      return { state: { ...state, status: "noMotion" }, isStopped: false };
    }
    const references = { ...state.references, [target]: patch };
    if (!references.min || !references.max) {
      return {
        state: { ...state, references, previousPatch: patch },
        isStopped: false,
      };
    }
    const discriminator = buildDiscriminator(references.min, references.max);
    return {
      state: {
        ...state,
        references,
        discriminator,
        previousPatch: patch,
        status: discriminator ? "watching" : "noMotion",
        lastMovementPercent: 100,
      },
      isStopped: false,
    };
  }

  const { discriminator, previousPatch } = state;
  const targetReference = state.references[target];
  if (
    !discriminator ||
    !targetReference ||
    (patch && patch.length !== targetReference.length)
  ) {
    return { state, isStopped: false };
  }
  const movedPercent =
    patch && previousPatch
      ? movementPercent(patch, previousPatch, discriminator)
      : 0;
  const hasMoved = movedPercent >= KIT_WATCH_MIN_MOVEMENT_PERCENT;
  const consecutiveMisses = hasMoved ? 0 : state.consecutiveMisses + 1;
  let { references } = state;
  let nextDiscriminator = discriminator;
  if (hasMoved && patch) {
    references = {
      ...references,
      [target]: blendReference(targetReference, patch),
    };
    if (references.min && references.max) {
      nextDiscriminator =
        buildDiscriminator(references.min, references.max) ?? discriminator;
    }
  }
  return {
    state: {
      ...state,
      references,
      discriminator: nextDiscriminator,
      previousPatch: patch ?? previousPatch,
      consecutiveMisses,
      lastMovementPercent: Math.min(100, movedPercent),
    },
    isStopped: consecutiveMisses >= KIT_WATCH_MISSES_TO_STOP,
  };
}

export function clampWatchBox(box: KitWatchBox): KitWatchBox {
  const width = Math.min(1, Math.max(KIT_WATCH_MIN_BOX_FRACTION, box.width));
  const height = Math.min(1, Math.max(KIT_WATCH_MIN_BOX_FRACTION, box.height));
  return {
    width,
    height,
    x: Math.min(1 - width, Math.max(0, box.x)),
    y: Math.min(1 - height, Math.max(0, box.y)),
  };
}

export function watchBoxBetween(
  start: { x: number; y: number },
  end: { x: number; y: number },
): KitWatchBox {
  return clampWatchBox({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  });
}
