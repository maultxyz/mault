export function releaseCanvases(
  canvases: (HTMLCanvasElement | null | undefined)[],
  keep: (HTMLCanvasElement | null | undefined)[] = [],
): void {
  for (const canvas of new Set(canvases)) {
    if (!canvas || keep.includes(canvas)) continue;
    canvas.width = 0;
    canvas.height = 0;
  }
}
