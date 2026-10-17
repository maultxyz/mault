import type { ScanRegion } from "@magic-vault/shared";
import { SCAN_REGION_COVERAGE_MIN, SCAN_REGION_OFFSET_LIMIT } from "@/lib/constants/calibration";

export function clampRegion(region: ScanRegion): ScanRegion {
  const clampOffset = (value: number) => Math.min(SCAN_REGION_OFFSET_LIMIT, Math.max(-SCAN_REGION_OFFSET_LIMIT, value));
  return {
    coverage: Math.min(1, Math.max(SCAN_REGION_COVERAGE_MIN, region.coverage)),
    offsetX: clampOffset(region.offsetX),
    offsetY: clampOffset(region.offsetY),
  };
}
