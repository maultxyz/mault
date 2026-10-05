import { apiGet, apiPut } from "@/lib/api/client";
import type {
  AdminPlanConfigResponse,
  PlanConfig,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const planConfigQueryOptions = queryOptions({
  queryKey: ["admin", "plans"] as const,
  queryFn: () =>
    apiGet<Result<AdminPlanConfigResponse>>("/api/admin/plans").then(
      (r) => r.data ?? null,
    ),
});

export function savePlanConfig(
  config: PlanConfig,
): Promise<Result<AdminPlanConfigResponse>> {
  return apiPut("/api/admin/plans", config);
}
