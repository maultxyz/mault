import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { CAMERA_MOUNT_SETTLE_MS } from "@/lib/constants/scanner";

export function useCameraMountReady(focused: boolean): boolean {
  const settledFocus = useDebouncedValue(focused, CAMERA_MOUNT_SETTLE_MS);
  return focused && settledFocus;
}
