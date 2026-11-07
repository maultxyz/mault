import {
  isCompleteCardInWindow,
  mergeCardCandidates,
  multiCardProposalWindows,
  multiCardRefineWindow,
  offsetContour,
  type CardContour,
  type MultiCardCandidate,
  type PixelBox,
  type ScanRegion,
} from "@magic-vault/shared";
import type { Image } from "react-native-nitro-image";
import type { CapturedFrame, IdentifyOptions, IdentifyOutcome } from "@/lib/interfaces/scanner";
import { imageToRgba } from "./frame";
import { identifyCard } from "./identify";
import { detectCornersInImage } from "./inference";

function cropImage(image: Image, box: PixelBox): Promise<Image> {
  return image.cropAsync(box.x, box.y, box.x + box.width, box.y + box.height);
}

export async function findCardsInFrame(
  frame: CapturedFrame,
  onProgress: (done: number, total: number) => void,
): Promise<CardContour[]> {
  const { width, height } = frame.pixels;
  const windows = multiCardProposalWindows(width, height);
  const candidates: MultiCardCandidate[] = [];
  for (const [index, window] of windows.entries()) {
    const crop = await cropImage(frame.image, window);
    const detection = await detectCornersInImage(crop, window.width, window.height);
    if (detection.cardPresent && detection.contour && isCompleteCardInWindow(detection.contour, window.width, window.height)) {
      candidates.push({ contour: offsetContour(detection.contour, window), confidence: detection.confidence });
    }
    onProgress(index + 1, windows.length);
  }
  return mergeCardCandidates(candidates).map((candidate) => candidate.contour);
}

export async function identifyCardInFrame(
  frame: CapturedFrame,
  contour: CardContour,
  options: IdentifyOptions,
  scanRegion: ScanRegion,
): Promise<IdentifyOutcome> {
  const window = multiCardRefineWindow(contour, frame.pixels.width, frame.pixels.height);
  const image = await cropImage(frame.image, window);
  const cardFrame: CapturedFrame = { image, pixels: await imageToRgba(image), scale: frame.scale };
  return identifyCard(async () => cardFrame, options, scanRegion);
}
