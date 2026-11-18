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
            <Skeleton className="h-32 rounded-card" />
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
