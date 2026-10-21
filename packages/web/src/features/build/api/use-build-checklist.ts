import { buildChecklistStore } from "@/features/build/lib/checklist-store";
import { useChecklist } from "@/hooks/use-checklist";

export function useBuildChecklist() {
  return useChecklist(buildChecklistStore);
}
