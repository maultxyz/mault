import { apiGet, apiPost } from "@/lib/api/client";
import type {
  AdminFoilLabelQueue,
  AdminFoilLabelRequest,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const adminFoilLabelQueueQueryOptions = queryOptions({
  queryKey: ["admin", "foil-labels", "queue"] as const,
  queryFn: () =>
    apiGet<Result<AdminFoilLabelQueue>>("/api/admin/foil-labels/queue").then(
      (r) => r.data ?? null,
    ),
  refetchOnWindowFocus: false,
});

export function saveAdminFoilLabel(
  request: AdminFoilLabelRequest,
): Promise<Result<null>> {
  return apiPost("/api/admin/foil-labels", request);
}
