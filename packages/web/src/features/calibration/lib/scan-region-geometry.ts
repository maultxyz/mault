import type { CameraSource } from "@/lib/interfaces/scanner";
import type { CardContour, ScanRegion } from "@magic-vault/shared";

export function clampRegion(region: ScanRegion): ScanRegion {
  return {
    coverage: Math.min(1, Math.max(0.1, region.coverage)),
    offsetX: Math.min(0.45, Math.max(-0.45, region.offsetX)),
    offsetY: Math.min(0.45, Math.max(-0.45, region.offsetY)),
  };
}

export function nudgeRegionByKey(
  region: ScanRegion,
  key: string,
  isLargeStep: boolean,
  cameraSource: CameraSource,
): ScanRegion | null {
  const step = isLargeStep ? 0.05 : 0.01;
  if (key === "+" || key === "=") {
    return clampRegion({ ...region, coverage: region.coverage + step });
  }
  if (key === "-" || key === "_") {
    return clampRegion({ ...region, coverage: region.coverage - step });
  }
  const screenDelta: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const delta = screenDelta[key];
  if (!delta) return null;
  const [dx, dy] = delta;
  const offsets =
    cameraSource === "phone"
      ? { offsetX: region.offsetX + dx, offsetY: region.offsetY + dy }
      : { offsetX: region.offsetX + dy, offsetY: region.offsetY - dx };
  return clampRegion({ ...region, ...offsets });
}

export function rawContourToPortraitBox(
  contour: CardContour,
  rawWidth: number,
  rawHeight: number,
) {
  const corners = [
    contour.topLeft,
    contour.topRight,
    contour.bottomRight,
    contour.bottomLeft,
  ];
  const portraitPoints = corners.map((p) => ({
    x: 1 - p.y / rawHeight,
    y: p.x / rawWidth,
  }));
  const xs = portraitPoints.map((p) => p.x);
  const ys = portraitPoints.map((p) => p.y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function contourToBox(
  contour: CardContour,
  width: number,
  height: number,
) {
  const corners = [
    contour.topLeft,
    contour.topRight,
    contour.bottomRight,
    contour.bottomLeft,
  ];
  const xs = corners.map((p) => p.x / width);
  const ys = corners.map((p) => p.y / height);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function fitFrameToContainer(
  frame: HTMLElement,
  container: HTMLElement,
  canvasWidth: number,
  canvasHeight: number,
) {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const scale = Math.max(cw / canvasWidth, ch / canvasHeight);
  const cssW = Math.round(canvasWidth * scale);
  const cssH = Math.round(canvasHeight * scale);
  frame.style.width = `${cssW}px`;
  frame.style.height = `${cssH}px`;
  frame.style.left = `${(cw - cssW) / 2}px`;
  frame.style.top = `${(ch - cssH) / 2}px`;
}
