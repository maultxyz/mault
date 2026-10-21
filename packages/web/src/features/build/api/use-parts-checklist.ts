import { partsChecklistStore } from "@/features/build/lib/checklist-store";
import { useChecklist } from "@/hooks/use-checklist";

export function usePartsChecklist() {
  return useChecklist(partsChecklistStore);
}
