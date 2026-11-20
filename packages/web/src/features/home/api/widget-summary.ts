import { apiGet } from "@/lib/api/client";
import {
  WIDGET_SUMMARY_INCLUDE_COLLECTION_SUMMARIES_PARAM,
  WIDGET_SUMMARY_QUERY_KEY,
} from "@/lib/constants/home";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import { STORED_STATS_REFRESHING_POLL_MS } from "@magic-vault/shared";
import type { Result, WidgetSummary } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

function loadWidgetSummary(includeCollectionSummaries: boolean) {
  const query = includeCollectionSummaries
    ? ""
    : `?${new URLSearchParams({ [WIDGET_SUMMARY_INCLUDE_COLLECTION_SUMMARIES_PARAM]: "false" })}`;
  return apiGet<Result<WidgetSummary>>(`/api/overview/widgets${query}`).then(
    (r) => r.data ?? null,
  );
}

export const widgetSummaryQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: [WIDGET_SUMMARY_QUERY_KEY, orgId] as const,
    queryFn: () => loadWidgetSummary(false),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
    refetchInterval: (query) =>
      query.state.data?.isRefreshing ? STORED_STATS_REFRESHING_POLL_MS : false,
  });

export const widgetSummaryWithCollectionsQueryOptions = (
  orgId: string | undefined,
) =>
  queryOptions({
    queryKey: [WIDGET_SUMMARY_QUERY_KEY, orgId, "with-collection-summaries"] as const,
    queryFn: () => loadWidgetSummary(true),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
    refetchInterval: (query) =>
      query.state.data?.isRefreshing ? STORED_STATS_REFRESHING_POLL_MS : false,
  });
