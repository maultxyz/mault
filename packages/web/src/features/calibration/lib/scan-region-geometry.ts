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
