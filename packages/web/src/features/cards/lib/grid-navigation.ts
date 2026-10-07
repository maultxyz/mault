import type { GridNavigationKey } from "@/lib/interfaces/cards";

export function isGridNavigationKey(key: string): key is GridNavigationKey {
  return (
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown"
  );
}

export function countGridColumns(items: HTMLElement[]) {
  if (items.length === 0) return 1;
  const firstRowTop = items[0].offsetTop;
  const nextRowStart = items.findIndex(
    (item) => item.offsetTop !== firstRowTop,
  );
  return nextRowStart === -1 ? items.length : nextRowStart;
}

export function nextGridIndex(
  index: number,
  count: number,
  columns: number,
  key: GridNavigationKey,
): number | null {
  switch (key) {
    case "ArrowLeft":
      return Math.max(index - 1, 0);
    case "ArrowRight":
      return Math.min(index + 1, count - 1);
    case "ArrowUp":
      return index - columns < 0 ? null : index - columns;
    case "ArrowDown":
      return Math.min(index + columns, count - 1);
  }
}
