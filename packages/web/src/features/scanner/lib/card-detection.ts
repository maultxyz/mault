import {
  MTG_ASPECT_RATIO,
  SCAN_REGION_MASK_FILL,
  SCAN_REGION_MASK_STROKE,
} from "@/lib/constants/scanner";
import type { CardContour, DetectionResult } from "@magic-vault/shared";

export function extractCardImage(
  sourceCanvas: HTMLCanvasElement,
  contour: CardContour,
  outputWidth = 745,
): HTMLCanvasElement {
  const outputHeight = Math.round(outputWidth / MTG_ASPECT_RATIO);

  const left = contour.topLeft.x;
  const top = contour.topLeft.y;
  const boxW = contour.topRight.x - contour.topLeft.x;
  const boxH = contour.bottomLeft.y - contour.topLeft.y;

  const isLandscape = boxW > boxH;
  const cropW = isLandscape ? outputHeight : outputWidth;
  const cropH = isLandscape ? outputWidth : outputHeight;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("Could not get canvas context");
  cropCtx.drawImage(sourceCanvas, left, top, boxW, boxH, 0, 0, cropW, cropH);

  if (!isLandscape) return cropCanvas;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outCtx = outputCanvas.getContext("2d");
  if (!outCtx) throw new Error("Could not get canvas context");
  outCtx.translate(outputWidth / 2, outputHeight / 2);
  outCtx.rotate(Math.PI / 2);
  outCtx.drawImage(cropCanvas, -cropW / 2, -cropH / 2);
  return outputCanvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      },
      "image/jpeg",
      quality,
    );
  });
}

export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  result: DetectionResult,
): void {
  if (!result.detected || !result.contour) return;

  const { topLeft, topRight, bottomRight, bottomLeft } = result.contour;
  const corners = [topLeft, topRight, bottomRight, bottomLeft];

  const primaryRaw = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  const color = primaryRaw ? `${primaryRaw}` : "#6d28d9";

  // Scaled off canvas short side, not a fixed pixel count: source resolution
  // varies widely (webcam vs. phone camera), and a width tuned for 1080p
  // looks huge once a smaller canvas gets CSS-scaled up to the same box.
  const shortSide = Math.min(ctx.canvas.width, ctx.canvas.height);
  const lineWidth = Math.max(3, Math.round(shortSide * 0.011));
  const radius = Math.max(4, Math.round(shortSide * 0.0148));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  for (let i = 0; i < corners.length; i++) {
    const prev = corners[(i - 1 + corners.length) % corners.length];
    const curr = corners[i];
    const next = corners[(i + 1) % corners.length];

    if (i === 0) {
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.moveTo(mx, my);
    }

    ctx.arcTo(curr.x, curr.y, next.x, next.y, radius);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

export function drawScanRegionMask(
  ctx: CanvasRenderingContext2D,
  contour: CardContour,
): void {
  const { width, height } = ctx.canvas;
  const { topLeft, bottomRight } = contour;
  const shortSide = Math.min(width, height);
  const radius = Math.max(6, Math.round(shortSide * 0.025));
  const lineWidth = Math.max(2, Math.round(shortSide * 0.006));
  const boxW = bottomRight.x - topLeft.x;
  const boxH = bottomRight.y - topLeft.y;

  ctx.save();
  ctx.fillStyle = SCAN_REGION_MASK_FILL;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.roundRect(topLeft.x, topLeft.y, boxW, boxH, radius);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = SCAN_REGION_MASK_STROKE;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.roundRect(topLeft.x, topLeft.y, boxW, boxH, radius);
  ctx.stroke();
  ctx.restore();
}
