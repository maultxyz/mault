import { EmptyState } from "@/components/empty-state";
import { PlanNotice } from "@/components/plan-notice";
import { SaveBar } from "@/components/save-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  useStoragePlan,
  useStoragePlanDialogs,
} from "@/features/bins/api/use-storage-plan";
import { StoragePlanBinsStrip } from "@/features/bins/components/storage-plan-bins-strip";
import { StoragePlanDialogs } from "@/features/bins/components/storage-plan-dialogs";
import { StoragePlanFill } from "@/features/bins/components/storage-plan-fill";
import { StoragePlanRowActions } from "@/features/bins/components/storage-plan-row-actions";
import { StoragePlanStatusBadge } from "@/features/bins/components/storage-plan-status-badge";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import { STORAGE_PLAN_SKELETON_ROWS } from "@/lib/constants/skeletons";
import { IconBox, IconPlus, IconStack2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileStoragePlan() {
  const { t } = useTranslation("bins");
  const { t: tStorage } = useTranslation("storage");
  const { isModeDirty, isSavingMode, saveMode, discardMode } = useBinConfigs();
  const plan = useStoragePlan();
  const dialogs = useStoragePlanDialogs();

  return (
    <>
      <p className="text-sm text-foreground/70">{t("storagePlan.description")}</p>
      {plan.isLocked && plan.rows.length === 0 ? (
        <PlanNotice message={t("storagePlan.notInPlan")} />
      ) : (
        <>
          {plan.rows.length > 0 && <StoragePlanBinsStrip claims={plan.claims} />}
          {plan.isLoading ? (
            <div role="status" aria-busy="true" className={MOBILE_LIST_CLASS}>
              <span className="sr-only">{t("a11y.loading", { ns: "common" })}</span>
              {Array.from({ length: STORAGE_PLAN_SKELETON_ROWS }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-3.5 w-3 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="ml-auto h-4 w-14 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-1 flex-1 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                </div>
              ))}
            </div>
          ) : plan.rows.length === 0 ? (
            <EmptyState
              size="compact"
              icon={IconBox}
              title={t("storagePlan.empty.title")}
              description={t("storagePlan.empty.description")}
              className="rounded-card bg-card"
            />
          ) : (
            <ol className={MOBILE_LIST_CLASS} aria-label={t("storagePlan.heading")}>
              {plan.rows.map((row) => (
                <li key={row.location.guid} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 shrink-0 text-sm tabular-nums text-foreground/70">
                    {row.order}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {row.location.name}
                      </span>
                      <StoragePlanStatusBadge row={row} />
                    </div>
                    <StoragePlanFill row={row} />
                    <span className="text-xs text-foreground/70">
                      {row.location.batchSize == null
                        ? tStorage("sizes.noBatches")
                        : t("storagePlan.batchOf", { count: row.location.batchSize })}
                    </span>
                  </div>
                  <StoragePlanRowActions
                    row={row}
                    rowCount={plan.rows.length}
                    disabled={plan.disabled}
                    onMove={(offset) => plan.move(row.location.guid, offset)}
                    onEdit={() => dialogs.setEditingLocation(row.location)}
                    onRemove={() => plan.remove(row.location.guid)}
                  />
                </li>
              ))}
            </ol>
          )}
          {!plan.isLocked && (
            <div className="grid grid-cols-2 gap-1.5">
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
          )}
          {plan.rows.length > 0 && (
            <p className="text-xs text-foreground/70">{t("storagePlan.runOut")}</p>
          )}
        </>
      )}
      <StoragePlanDialogs dialogs={dialogs} />
      <SaveBar
        show={isModeDirty}
        onSave={saveMode}
        isSaving={isSavingMode}
        onDiscard={discardMode}
      />
      <UnsavedChangesGuard isDirty={isModeDirty} onDiscard={discardMode} />
    </>
  );
}
