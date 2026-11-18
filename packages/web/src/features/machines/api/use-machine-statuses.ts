import {
  getMachineStatuses,
  subscribeMachineStatuses,
} from "@/features/machines/lib/machine-status-store";
import type { MachineStatus } from "@magic-vault/shared";
import { useSyncExternalStore } from "react";

export function useMachineStatuses(): MachineStatus[] {
  return useSyncExternalStore(subscribeMachineStatuses, getMachineStatuses);
}
