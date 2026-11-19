import { useQueryClient } from "@tanstack/react-query";
import type { PlanKey } from "@magic-vault/shared";
import { setPlanPreviewForSignedInAdmin, usePlanPreviewForSignedInAdmin } from "@/lib/auth/plan-preview";

export function usePlanPreview() {
  const queryClient = useQueryClient();
  const previewPlan = usePlanPreviewForSignedInAdmin();

  const changePreviewPlan = (plan: PlanKey | null) => {
    if (plan === previewPlan) return;
    setPlanPreviewForSignedInAdmin(plan);
    void queryClient.invalidateQueries();
  };

  return { previewPlan, changePreviewPlan };
}
