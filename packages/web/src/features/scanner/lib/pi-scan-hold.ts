let held = false;

export function setPiScanHoldingPort(value: boolean) {
  held = value;
}

export function isPiScanHoldingPort(): boolean {
  return held;
}
