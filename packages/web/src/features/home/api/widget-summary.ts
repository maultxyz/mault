import { apiGet } from "@/lib/api/client";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import type { Result, WidgetSummary } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const widgetSummaryQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["widget-summary", orgId] as const,
    queryFn: () =>
      apiGet<Result<WidgetSummary>>("/api/overview/widgets").then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
    refetchInterval: ORG_OVERVIEW_REFRESH_MS,
  });
