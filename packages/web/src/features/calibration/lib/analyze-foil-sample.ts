import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { dewarpCard } from "@/features/scanner/lib/perspective-warp";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import { FOIL_ANALYSIS_HEIGHT, FOIL_ANALYSIS_WIDTH, FOIL_ANALYSIS_VERSION, FOIL_DIRECTION_FAR_LEDS, FOIL_DIRECTION_FRAMES, FOIL_QUALITY_LIMITS } from "@/lib/constants/foil-calibration";
import type { FoilCalibrationSample, FoilSampleAnalysis, FoilWhiteFrame } from "@/lib/interfaces/foil-calibration";
import { compareFoilWhites, foilCardPixels, foilCornerShift, foilQualityWarnings, foilReferenceIndex, measureFoilCard, resolveFoilContour } from "./foil-card-metrics";
import type { CardContour, RgbaImage } from "@magic-vault/shared";
import { measureFoilReflections } from "./foil-reflections";
import { measureFoilAmbientResponse } from "./foil-ambient-response";
import { measureFoilDirectionResponse } from "./foil-direction-response";
import { foilVerdict, measureFoilRainbow, measureFoilReflectance } from "./foil-rainbow-response";

export async function analyzeFoilSample(sample: FoilCalibrationSample): Promise<FoilSampleAnalysis> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Foil analysis canvas unavailable");
  const frames: FoilSampleAnalysis["frames"] = [];
  const whites = new Map<string, FoilWhiteFrame>();
  const directionCrops = new Map<string, RgbaImage>();
  let frameWidth: number | null = null;
  let frameHeight: number | null = null;
  let ambient: RgbaImage | null = null;
  let ambientContour: CardContour | null = null;
  const draw = async (source: string) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    if (frameWidth !== null && (canvas.width !== frameWidth || canvas.height !== frameHeight)) {
      throw new Error("Foil capture dimensions changed");
    }
    frameWidth = canvas.width;
    frameHeight = canvas.height;
    ctx.drawImage(image, 0, 0);
  };
  try {
    const detections: (CardContour | null)[] = [];
    for (const frame of sample.frames) {
      await draw(frame.image);
      const detection = await detectCardCorners(canvas);
      detections.push(detection.cardPresent ? detection.contour : null);
    }
    const referenceIndex = foilReferenceIndex(sample.frames.map((frame, index) => ({
      lit: frame.lighting.lightMode !== "off", detected: detections[index] !== null,
    })));
    const reference = referenceIndex >= 0 ? detections[referenceIndex] : null;
    for (const [index, frame] of sample.frames.entries()) {
      await draw(frame.image);
      const contour = resolveFoilContour(detections[index], reference,
        frame.lighting.lightMode !== "off", canvas.width, canvas.height);
      if (!contour) {
        frames.push({ step: frame.step, contour: null, cardImage: null, metrics: null });
        continue;
      }
      const crop = dewarpCard(canvas, contour, FOIL_ANALYSIS_WIDTH, FOIL_ANALYSIS_HEIGHT);
      try {
        const cropCtx = crop.getContext("2d");
        if (!cropCtx) throw new Error("Foil card crop unavailable");
        const imageData = cropCtx.getImageData(0, 0, crop.width, crop.height);
        const pixels = foilCardPixels(imageData);
        if (frame.step === "ambient") {
          ambient = imageData;
          ambientContour = contour;
        }
        const ambientResponse = frame.step !== "ambient" && ambient && ambientContour &&
          foilCornerShift(ambientContour, contour, canvas.width, canvas.height) <= FOIL_QUALITY_LIMITS.movement
          ? measureFoilAmbientResponse(ambient, imageData) : null;
        frames.push({ step: frame.step, contour, cardImage: crop.toDataURL("image/jpeg", 0.92),
          metrics: measureFoilCard(pixels), reflections: measureFoilReflections(imageData), ambientResponse });
        if (["white", "whiteRepeat", "whiteBright", "whiteBrightRepeat", "ambient", "ambientRepeat", ...FOIL_DIRECTION_FRAMES].includes(frame.step)) {
          whites.set(frame.step, { pixels, contour, width: canvas.width, height: canvas.height });
        }
        if (FOIL_DIRECTION_FRAMES.includes(frame.step)) directionCrops.set(frame.step, imageData);
      } finally {
        releaseCanvases([crop]);
      }
    }
    const first = whites.get("white");
    const repeat = whites.get("whiteRepeat");
    if (first && repeat && (first.width !== repeat.width || first.height !== repeat.height)) {
      throw new Error("White capture dimensions changed");
    }
    const whiteComparison = first && repeat
      ? compareFoilWhites(first.pixels, repeat.pixels, first.contour, repeat.contour, first.width, first.height)
      : null;
    const ambientFirst = whites.get("ambient");
    const ambientRepeat = whites.get("ambientRepeat");
    const ambientComparison = ambientFirst && ambientRepeat
      ? compareFoilWhites(ambientFirst.pixels, ambientRepeat.pixels,
        ambientFirst.contour, ambientRepeat.contour, ambientFirst.width, ambientFirst.height)
      : null;
    const brightFirst = whites.get("whiteBright");
    const brightRepeat = whites.get("whiteBrightRepeat");
    const brightComparison = brightFirst && brightRepeat
      ? compareFoilWhites(brightFirst.pixels, brightRepeat.pixels,
        brightFirst.contour, brightRepeat.contour, brightFirst.width, brightFirst.height)
      : null;
    const compareWhites = (firstStep: string, secondStep: string) => {
      const a = whites.get(firstStep);
      const b = whites.get(secondStep);
      return a && b ? compareFoilWhites(a.pixels, b.pixels, a.contour, b.contour, a.width, a.height) : null;
    };
    const compareDirections = (firstStep: string, secondStep: string) => {
      const a = directionCrops.get(firstStep);
      const b = directionCrops.get(secondStep);
      return a && b ? measureFoilDirectionResponse(a, b) : null;
    };
    const rainbowBetween = (firstStep: string, secondStep: string) => {
      const a = directionCrops.get(firstStep);
      const b = directionCrops.get(secondStep);
      return a && b ? measureFoilRainbow(a, b) : null;
    };
    const reflectanceBetween = (firstStep: string, secondStep: string) => {
      const a = directionCrops.get(firstStep);
      const b = directionCrops.get(secondStep);
      return a && b ? measureFoilReflectance(a, b) : null;
    };
    const hasDirection = sample.frames.some((frame) => frame.step === "led0");
    const far = FOIL_DIRECTION_FAR_LEDS.find((candidate) => sample.frames.some((frame) => frame.step === candidate.step))
      ?? FOIL_DIRECTION_FAR_LEDS[0];
    const rainbow = rainbowBetween("led0", far.step);
    const rainbowRepeat = rainbowBetween("led0Repeat", far.repeat);
    const directionBase = hasDirection ? {
      response: compareDirections("led0", far.step),
      repeatNoise: compareDirections("led0", "led0Repeat"),
      led0Comparison: compareWhites("led0", "led0Repeat"),
      farLed: far.led,
      farComparison: compareWhites(far.step, far.repeat),
      rainbow: rainbow?.rainbow ?? null,
      rainbowRepeat: rainbowRepeat?.rainbow ?? null,
      localRainbow: rainbow?.localRainbow ?? null,
      localRainbowRepeat: rainbowRepeat?.localRainbow ?? null,
      reflectance: {
        first: reflectanceBetween("led0", far.step),
        repeat: reflectanceBetween("led0Repeat", far.repeat),
        led0Noise: reflectanceBetween("led0", "led0Repeat"),
        farNoise: reflectanceBetween(far.step, far.repeat),
      },
    } : undefined;
    const warnings = foilQualityWarnings(frames, sample.frames.some((frame) => frame.step === "whiteRepeat") ? whiteComparison : undefined, {
      ...(sample.frames.some((frame) => frame.step === "ambientRepeat") && { ambientComparison }),
      ...(sample.frames.some((frame) => frame.step === "whiteBrightRepeat") && { brightComparison }),
    });
    if (directionBase && [directionBase.led0Comparison, directionBase.farComparison].some((comparison) =>
      !comparison || foilQualityWarnings([], comparison).length > 0)) {
      warnings.push("directionUnstable");
    }
    const direction = directionBase && {
      ...directionBase,
      verdict: foilVerdict(directionBase.reflectance, !sample.label.sleeved && !warnings.includes("directionUnstable") &&
        directionBase.response !== null && directionBase.repeatNoise !== null &&
        frames.filter((frame) => FOIL_DIRECTION_FRAMES.includes(frame.step)).every((frame) =>
          frame.metrics !== null && frame.metrics.clippedFraction <= FOIL_QUALITY_LIMITS.clipping)),
    };
    return { version: FOIL_ANALYSIS_VERSION, frames, whiteComparison, ambientComparison, brightComparison, ...(direction && { direction }), warnings };
  } finally {
    releaseCanvases([canvas]);
  }
}
