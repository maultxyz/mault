import { setPlanPreview, usePlanPreviewValue } from "@/lib/plan-preview";
import type { PlanKey } from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";

export function usePlanPreview() {
  const queryClient = useQueryClient();
  const previewPlan = usePlanPreviewValue();

  const changePreviewPlan = (plan: PlanKey | null) => {
    setPlanPreview(plan);
    void queryClient.invalidateQueries();
  };

  return { previewPlan, changePreviewPlan };
}
