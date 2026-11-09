import {
  detectCardStampRgba,
  type PlayingCard,
  type StampDetection,
} from "@magic-vault/shared";

export function detectStamp(
  canvas: HTMLCanvasElement,
  card: PlayingCard | null,
): StampDetection | null {
  if (!card?.stamps?.length) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return detectCardStampRgba(
    ctx.getImageData(0, 0, canvas.width, canvas.height),
    card,
  );
}
