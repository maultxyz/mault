import {
  contourToPoints,
  solveHomographyDstToSrc,
  warpRgba,
  type CardContour,
} from "@magic-vault/shared";

export function dewarpCard(
  source: HTMLCanvasElement,
  contour: CardContour,
  outputWidth = 448,
  outputHeight = outputWidth,
): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
  const outCtx = output.getContext("2d");
  if (!outCtx) throw new Error("Could not get canvas context");

  const points = contourToPoints(contour);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const left = Math.max(0, Math.floor(Math.min(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const right = Math.min(source.width, Math.ceil(Math.max(...xs)) + 1);
  const bottom = Math.min(source.height, Math.ceil(Math.max(...ys)) + 1);
  if (right <= left || bottom <= top) return output;

  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) throw new Error("Could not get canvas context");
  const region = sourceCtx.getImageData(left, top, right - left, bottom - top);
  const homography = solveHomographyDstToSrc(
    points.map((p) => ({ x: p.x - left, y: p.y - top })),
  );
  const warped = warpRgba(region, homography, outputWidth, outputHeight);
  const outData = outCtx.createImageData(outputWidth, outputHeight);
  outData.data.set(warped.data);
  outCtx.putImageData(outData, 0, 0);
  return output;
}
