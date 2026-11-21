import { apiGet } from "@/lib/api/client";
import type {
  AdminSubscriptionSummaryResponse,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const subscriptionSummaryQueryOptions = queryOptions({
  queryKey: ["admin", "subscription-summary"] as const,
  queryFn: () =>
    apiGet<Result<AdminSubscriptionSummaryResponse>>(
      "/api/admin/subscription-summary",
    ).then((r) => r.data ?? null),
});
