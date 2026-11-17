import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { ListSkeleton } from "@/components/list-skeleton";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  activityQueryOptions,
  staffReportQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { formatDateTime, formatPercent } from "@/features/business/lib/format";
import { ACTIVITY_ALL_FILTER } from "@/lib/constants/business";
import type { StaffReportViewProps } from "@/lib/interfaces/business";
import {
  ACTIVITY_ACTION_KEYS,
  ACTIVITY_ACTIONS,
  STATS_RANGES,
  type ActivityAction,
} from "@magic-vault/shared";
import { IconHistory, IconLock, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StaffReportView({ range, onRangeChange }: StaffReportViewProps) {
  const { t } = useTranslation("business");
  const { t: tStats } = useTranslation("stats");
  const { orgId, access } = useBusinessAccess();
  const [page, setPage] = useState(1);
  const [user, setUser] = useState<string | null>(null);
  const [action, setAction] = useState<ActivityAction | null>(null);
  const allowed = access?.canViewActivity ?? false;
  const { data: staff, isLoading } = useQuery({
    ...staffReportQueryOptions(orgId, range),
    enabled: !!orgId && allowed,
  });
  const { data: activity } = useQuery({
    ...activityQueryOptions(orgId, page, user, action),
    enabled: !!orgId && allowed,
  });

  if (access && !allowed) {
    return (
      <Callout variant="info" icon={IconLock}>
        {t("reports.staff.noAccess")}
      </Callout>
    );
  }

  const pageCount = activity
    ? Math.max(Math.ceil(activity.total / activity.pageSize), 1)
    : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold">
          {t("reports.staff.throughput")}
        </h2>
        <ResponsiveSegmented
          label={tStats("controls.range")}
          items={STATS_RANGES.map((option) => ({
            key: option,
            label: tStats(`controls.ranges.${option}`),
          }))}
          value={range}
          onChange={onRangeChange}
        />
      </div>
      {isLoading || !staff ? (
        <ListSkeleton rows={4} />
      ) : staff.rows.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconUsers}
          title={t("reports.staff.empty")}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.person")}</TableHead>
                <TableHead className="text-right">{t("table.scans")}</TableHead>
                <TableHead className="text-right">{t("table.matchRate")}</TableHead>
                <TableHead className="text-right">{t("table.corrected")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
                <TableHead>{t("table.lastScan")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="max-w-48 truncate font-medium">
                    {row.userName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.scans.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(row.scans ? row.matched / row.scans : null)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.corrected.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.actions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-foreground/70">
                    {formatDateTime(row.lastScanAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold">
          {t("reports.staff.activity")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Select
            value={user ?? ACTIVITY_ALL_FILTER}
            onValueChange={(value) => {
              setUser(!value || value === ACTIVITY_ALL_FILTER ? null : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44" aria-label={t("reports.staff.filterUser")}>
              <SelectValue>
                {staff?.rows.find((row) => row.userId === user)?.userName ??
                  t("reports.staff.allPeople")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTIVITY_ALL_FILTER}>
                {t("reports.staff.allPeople")}
              </SelectItem>
              {staff?.rows.map((row) => (
                <SelectItem key={row.userId} value={row.userId}>
                  {row.userName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={action ?? ACTIVITY_ALL_FILTER}
            onValueChange={(value) => {
              setAction(
                !value || value === ACTIVITY_ALL_FILTER
                  ? null
                  : (value as ActivityAction),
              );
              setPage(1);
            }}
          >
            <SelectTrigger className="w-52" aria-label={t("reports.staff.filterAction")}>
              <SelectValue>
                {action
                  ? t(`activity.labels.${ACTIVITY_ACTION_KEYS[action]}`)
                  : t("reports.staff.allActions")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTIVITY_ALL_FILTER}>
                {t("reports.staff.allActions")}
              </SelectItem>
              {ACTIVITY_ACTIONS.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`activity.labels.${ACTIVITY_ACTION_KEYS[key]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {!activity ? (
        <ListSkeleton rows={6} />
      ) : activity.entries.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconHistory}
          title={t("reports.staff.noActivity")}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.person")}</TableHead>
                  <TableHead>{t("table.event")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.entries.map((entry) => (
                  <TableRow key={entry.guid}>
                    <TableCell className="text-foreground/70">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {entry.userName ?? "-"}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {t(`activity.messages.${ACTIVITY_ACTION_KEYS[entry.action]}`, {
                        ...entry.details,
                        summary: entry.summary ?? "",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListPagination
            pagination={{
              page: activity.page,
              pageCount,
              from: (activity.page - 1) * activity.pageSize + 1,
              to: (activity.page - 1) * activity.pageSize + activity.entries.length,
              total: activity.total,
              setPage,
            }}
          />
        </>
      )}
    </div>
  );
}
