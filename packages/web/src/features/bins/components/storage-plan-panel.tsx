import { EmptyState } from "@/components/empty-state";
import { PlanNotice } from "@/components/plan-notice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useStoragePlan,
  useStoragePlanDialogs,
} from "@/features/bins/api/use-storage-plan";
import { StoragePlanBinsStrip } from "@/features/bins/components/storage-plan-bins-strip";
import { StoragePlanDialogs } from "@/features/bins/components/storage-plan-dialogs";
import { StoragePlanFill } from "@/features/bins/components/storage-plan-fill";
import { StoragePlanRowActions } from "@/features/bins/components/storage-plan-row-actions";
import { StoragePlanStatusBadge } from "@/features/bins/components/storage-plan-status-badge";
import {
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PATH,
} from "@/lib/constants/storage";
import { IconBox, IconPlus, IconStack2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StoragePlanPanel() {
  const { t } = useTranslation("bins");
  const { t: tStorage } = useTranslation("storage");
  const plan = useStoragePlan();
  const dialogs = useStoragePlanDialogs();

  if (!plan.hasPreset) return null;

  const toolbar = (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        variant="outline"
        disabled={plan.disabled || plan.isFull}
        onClick={() => dialogs.setAddOpen(true)}
      >
        <IconPlus />
        {t("storagePlan.add")}
      </Button>
      <Button
        variant="outline"
        disabled={plan.disabled || plan.isFull}
        onClick={() => dialogs.setSeriesOpen(true)}
      >
        <IconStack2 />
        {tStorage("series.open")}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 max-w-2xl flex-col gap-0.5">
          <h2 className="font-heading text-base font-semibold">
            {t("storagePlan.heading")}
          </h2>
          <p className="text-sm text-foreground/70">
            {t("storagePlan.description")}
          </p>
        </div>
        {!plan.isLocked && toolbar}
      </div>

      {plan.isLocked && plan.rows.length === 0 ? (
        <PlanNotice message={t("storagePlan.notInPlan")} />
      ) : (
        <>
          {plan.rows.length > 0 && <StoragePlanBinsStrip claims={plan.claims} />}
          {plan.isLoading ? (
            <Skeleton className="h-40 rounded-card" />
          ) : plan.rows.length === 0 ? (
            <EmptyState
              size="compact"
              icon={IconBox}
              title={t("storagePlan.empty.title")}
              description={t("storagePlan.empty.description")}
              className="rounded-card bg-card"
            />
          ) : (
            <Table aria-label={t("storagePlan.heading")}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">{t("storagePlan.table.order")}</TableHead>
                  <TableHead>{t("storagePlan.table.location")}</TableHead>
                  <TableHead className="w-1/4">{t("storagePlan.table.fill")}</TableHead>
                  <TableHead>{t("storagePlan.table.capacity")}</TableHead>
                  <TableHead>{t("storagePlan.table.batch")}</TableHead>
                  <TableHead>{t("storagePlan.table.filling")}</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{t("storagePlan.table.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.rows.map((row) => (
                  <TableRow key={row.location.guid}>
                    <TableCell className="tabular-nums text-foreground/70">
                      {row.order}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        to={`${STORAGE_PATH}?${STORAGE_LOCATION_SEARCH_PARAM}=${row.location.guid}`}
                        className="hover:underline"
                      >
                        {row.location.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StoragePlanFill row={row} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.capacity ?? tStorage("sizes.noLimit")}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.location.batchSize ?? tStorage("sizes.noBatches")}
                    </TableCell>
                    <TableCell>
                      <StoragePlanStatusBadge row={row} />
                    </TableCell>
                    <TableCell className="text-right">
                      <StoragePlanRowActions
                        row={row}
                        rowCount={plan.rows.length}
                        disabled={plan.disabled}
                        onMove={(offset) => plan.move(row.location.guid, offset)}
                        onEdit={() => dialogs.setEditingLocation(row.location)}
                        onRemove={() => plan.remove(row.location.guid)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {plan.rows.length > 0 && (
            <p className="text-xs text-foreground/70">{t("storagePlan.runOut")}</p>
          )}
        </>
      )}
      <StoragePlanDialogs dialogs={dialogs} />
    </div>
  );
}
