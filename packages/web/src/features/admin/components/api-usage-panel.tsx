import { EmptyState } from "@/components/empty-state";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { SettingsSection } from "@/components/settings-section";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { getApiUsageReport } from "@/lib/api/admin";
import { API_USAGE_QUERY_KEY } from "@/lib/constants/admin";
import {
  API_USAGE_KEYS_SKELETON_COLUMNS,
  API_USAGE_ROUTES_SKELETON_COLUMNS,
} from "@/lib/constants/skeletons";
import {
  API_USAGE_REPORT_DAYS,
  DEFAULT_API_USAGE_REPORT_DAYS,
} from "@magic-vault/shared";
import { IconChartBar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ApiUsagePanel() {
  const { t, i18n } = useTranslation("admin");
  const [days, setDays] = useState(String(DEFAULT_API_USAGE_REPORT_DAYS));
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [...API_USAGE_QUERY_KEY, days],
    queryFn: () => getApiUsageReport(Number(days)),
  });
  const formatNumber = (value: number) => value.toLocaleString(i18n.language);
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <SettingsSection
      heading={t("apiUsage.heading")}
      description={t("apiUsage.description")}
    >
      <div className="flex flex-col gap-4 md:gap-2">
        <ResponsiveSegmented
          label={t("apiUsage.daysLabel")}
          items={API_USAGE_REPORT_DAYS.map((option) => ({
            key: String(option),
            label: t("apiUsage.dayOption", { count: option }),
          }))}
          value={days}
          onChange={setDays}
        />
        {isError ? (
          <LoadErrorCallout
            message={t("apiUsage.loadError")}
            onRetry={() => void refetch()}
          />
        ) : isPending || !data ? (
          <SkeletonStatus className="flex flex-col gap-4 md:gap-2">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-28" />
              <TableSkeleton columns={API_USAGE_KEYS_SKELETON_COLUMNS} rows={4} />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-32" />
              <TableSkeleton columns={API_USAGE_ROUTES_SKELETON_COLUMNS} rows={4} />
            </div>
          </SkeletonStatus>
        ) : (
          <>
            <section className="flex flex-col gap-2">
              <h3 className="font-heading text-sm font-semibold">
                {t("apiUsage.apiKeysHeading")}
              </h3>
              {data.apiKeys.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={IconChartBar}
                  title={t("apiUsage.emptyApiKeys")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("apiUsage.columns.organization")}</TableHead>
                      <TableHead>{t("apiUsage.columns.apiKey")}</TableHead>
                      <TableHead>{t("apiUsage.columns.endpoint")}</TableHead>
                      <TableHead className="text-right">
                        {t("apiUsage.columns.requests")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apiUsage.columns.rateLimited")}
                      </TableHead>
                      <TableHead>{t("apiUsage.columns.lastRequest")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.apiKeys.map((row) => (
                      <TableRow
                        key={`${row.orgId}:${row.apiKeyPrefix}:${row.endpoint}`}
                      >
                        <TableCell>{row.orgName ?? row.orgId}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            {row.apiKeyName}
                            <span className="font-mono text-xs text-foreground/70">
                              {row.apiKeyPrefix}
                            </span>
                            {row.isApiKeyRevoked && (
                              <Badge variant="secondary">
                                {t("apiUsage.revoked")}
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.endpoint}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.requestCount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.rateLimitedCount)}
                        </TableCell>
                        <TableCell>{formatDate(row.lastRequestAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="font-heading text-sm font-semibold">
                {t("apiUsage.publicRoutesHeading")}
              </h3>
              {data.publicRoutes.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={IconChartBar}
                  title={t("apiUsage.emptyPublicRoutes")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("apiUsage.columns.endpoint")}</TableHead>
                      <TableHead className="text-right">
                        {t("apiUsage.columns.requests")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apiUsage.columns.rateLimited")}
                      </TableHead>
                      <TableHead>{t("apiUsage.columns.lastRequest")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.publicRoutes.map((row) => (
                      <TableRow key={row.endpoint}>
                        <TableCell className="font-mono text-xs">
                          {row.endpoint}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.requestCount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.rateLimitedCount)}
                        </TableCell>
                        <TableCell>{formatDate(row.lastRequestAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          </>
        )}
      </div>
    </SettingsSection>
  );
}
