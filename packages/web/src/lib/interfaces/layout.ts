export interface UseResizablePanelOptions {
  axis: "width" | "height";
  defaultSize: number;
  min: number;
  max: number;
  storageKey: string;
  invert?: boolean;
}
