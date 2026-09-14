import { useDevice } from "@/features/calibration/api/use-device";
import { DEFAULT_MODULE_COUNT } from "@magic-vault/shared";

export function useModuleCount(): number {
  const device = useDevice();
  return device?.moduleCount ?? DEFAULT_MODULE_COUNT;
}
