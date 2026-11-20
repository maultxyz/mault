import { queryOptions } from "@tanstack/react-query";
import { STORED_STATS_REFRESHING_POLL_MS, type Result, type WidgetSummary } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import {
  WIDGET_SUMMARY_IDLE_STALE_MS,
  WIDGET_SUMMARY_QUERY_KEY,
  WIDGET_SUMMARY_REFRESH_MS,
} from "@/lib/constants/widgets";

export const widgetSummaryQueryOptions = (orgId: string | null, isAnyScannerRunning: boolean) =>
  queryOptions({
    queryKey: [WIDGET_SUMMARY_QUERY_KEY, orgId] as const,
    queryFn: () => unwrap(apiGet<Result<WidgetSummary>>("/api/overview/widgets")),
    enabled: !!orgId,
    staleTime: WIDGET_SUMMARY_IDLE_STALE_MS,
    refetchInterval: (query) => {
      if (query.state.data?.isRefreshing) return STORED_STATS_REFRESHING_POLL_MS;
      return isAnyScannerRunning ? WIDGET_SUMMARY_REFRESH_MS : WIDGET_SUMMARY_IDLE_STALE_MS;
    },
  });
