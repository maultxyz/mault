import { MILO_INPUT_SIZE, type CardContour } from "@magic-vault/shared";

export function resizeImageRegion(
  source: HTMLCanvasElement,
  region: CardContour,
): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = MILO_INPUT_SIZE;
  output.height = MILO_INPUT_SIZE;
  const context = output.getContext("2d");
  if (!context) throw new Error("Could not get canvas context");
  const left = region.topLeft.x;
  const top = region.topLeft.y;
  context.drawImage(
    source,
    left,
    top,
    region.bottomRight.x - left,
    region.bottomRight.y - top,
    0,
    0,
    output.width,
    output.height,
  );
  return output;
}
