import { queryOptions } from "@tanstack/react-query";
import type { Result, WidgetSummary } from "@magic-vault/shared";
import { Platform } from "react-native";
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
    enabled: !!orgId && Platform.OS === "ios",
    staleTime: WIDGET_SUMMARY_IDLE_STALE_MS,
    refetchInterval: isAnyScannerRunning ? WIDGET_SUMMARY_REFRESH_MS : WIDGET_SUMMARY_IDLE_STALE_MS,
  });
