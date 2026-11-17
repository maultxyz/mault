export interface UseResizablePanelOptions {
  axis: "width" | "height";
  defaultSize: number;
  min: number;
  max: number;
  storageKey: string;
  invert?: boolean;
}

export interface ResizeHandleProps {
  orientation: "vertical" | "horizontal";
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  valueNow?: number;
  valueMin?: number;
  valueMax?: number;
  className?: string;
}
