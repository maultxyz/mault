import { queryOptions } from "@tanstack/react-query";
import type { AdminPlanConfigResponse, PlanConfig, Result } from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";

export const planConfigQueryOptions = queryOptions({
  queryKey: ["admin", "plans"] as const,
  queryFn: () => unwrap(apiGet<Result<AdminPlanConfigResponse>>("/api/admin/plans")),
});

export function savePlanConfig(config: PlanConfig): Promise<AdminPlanConfigResponse> {
  return unwrap(apiPut<Result<AdminPlanConfigResponse>>("/api/admin/plans", config));
}

export function savePricingMode(isLegacyPricingActive: boolean): Promise<AdminPlanConfigResponse> {
  return unwrap(apiPut<Result<AdminPlanConfigResponse>>("/api/admin/plans/pricing-mode", { isLegacyPricingActive }));
}
