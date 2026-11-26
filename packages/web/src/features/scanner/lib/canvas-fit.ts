export function fitCanvasesToContainer(
  canvases: (HTMLCanvasElement | HTMLImageElement | null)[],
  videoWidth: number,
  videoHeight: number,
  rotated: boolean,
  fit: "cover" | "contain" = "cover",
) {
  const container = canvases[0]?.parentElement;
  if (!container || !videoWidth || !videoHeight) return;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const scaleToFit = fit === "contain" ? Math.min : Math.max;
  const scale = rotated
    ? scaleToFit(cw / videoHeight, ch / videoWidth)
    : scaleToFit(cw / videoWidth, ch / videoHeight);
  const cssW = Math.round(videoWidth * scale);
  const cssH = Math.round(videoHeight * scale);
  for (const canvas of canvases) {
    if (!canvas) continue;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${(cw - cssW) / 2}px`;
    canvas.style.top = `${(ch - cssH) / 2}px`;
  }
}

export function observeContainerResize(
  canvas: HTMLCanvasElement | HTMLImageElement | null,
  onResize: () => void,
): () => void {
  const container = canvas?.parentElement;
  if (!container) return () => {};
  const observer = new ResizeObserver(onResize);
  observer.observe(container);
  return () => observer.disconnect();
}

export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  flipped: boolean,
) {
  if (!flipped) {
    ctx.drawImage(video, 0, 0);
    return;
  }
  ctx.save();
  ctx.translate(ctx.canvas.width, ctx.canvas.height);
  ctx.rotate(Math.PI);
  ctx.drawImage(video, 0, 0);
  ctx.restore();
}
