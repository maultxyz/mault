export function fitCanvasesToContainer(
  canvases: (HTMLCanvasElement | null)[],
  videoWidth: number,
  videoHeight: number,
  rotated: boolean,
) {
  const container = canvases[0]?.parentElement;
  if (!container || !videoWidth || !videoHeight) return;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const scale = rotated
    ? Math.max(cw / videoHeight, ch / videoWidth)
    : Math.max(cw / videoWidth, ch / videoHeight);
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
  canvas: HTMLCanvasElement | null,
  onResize: () => void,
): () => void {
  const container = canvas?.parentElement;
  if (!container) return () => {};
  const observer = new ResizeObserver(onResize);
  observer.observe(container);
  return () => observer.disconnect();
}
