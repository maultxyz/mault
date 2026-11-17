import { selfHostChecklistStore } from "@/features/self-host/lib/checklist-store";
import { useChecklist } from "@/hooks/use-checklist";

export function useSelfHostChecklist() {
  return useChecklist(selfHostChecklistStore);
}
