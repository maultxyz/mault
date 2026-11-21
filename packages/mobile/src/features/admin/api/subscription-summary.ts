import { queryOptions } from "@tanstack/react-query";
import type { AdminSubscriptionSummaryResponse, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";

export const subscriptionSummaryQueryOptions = queryOptions({
  queryKey: ["admin", "subscription-summary"] as const,
  queryFn: () => unwrap(apiGet<Result<AdminSubscriptionSummaryResponse>>("/api/admin/subscription-summary")),
});
