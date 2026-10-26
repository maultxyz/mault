import { useRole } from "@/hooks/use-role";
import { IGNORE_IR_SENSORS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { createStoredFlag } from "@/lib/stored-flag";

const useStoredIgnoreIrSensors = createStoredFlag(IGNORE_IR_SENSORS_STORAGE_KEY);

export function useIgnoreIrSensors() {
  const { isAdmin } = useRole();
  const [stored, setIgnoreIrSensors] = useStoredIgnoreIrSensors();
  return [isAdmin && stored, setIgnoreIrSensors] as const;
}
