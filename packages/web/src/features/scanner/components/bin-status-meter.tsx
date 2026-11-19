import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { BinLevelGrid } from "@/features/scanner/components/bin-level-grid";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { EmptyAllBinsDialog } from "@/features/storage/components/empty-all-bins-dialog";
import { ResetAutoAssignToggle } from "@/features/storage/components/reset-auto-assign-toggle";
import { summarizeBinLevels } from "@/features/scanner/lib/bin-levels";
import { usePersistedFlag } from "@/hooks/use-persisted-state";
import { BIN_LEVELS_EXPANDED_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconTrash,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function BinStatusMeter() {
  const { t } = useTranslation("scanner");
  const levels = useBinFillLevels();
  const { emptyAllBins, selectedSet, sets } = useBinConfigs();
  const { activeCollection } = useCollections();
  const [confirmAll, setConfirmAll] = useState(false);
  const [resetAutoAssignedRules, setResetAutoAssignedRules] = useState(true);
  const [expanded, setExpanded] = usePersistedFlag(
    BIN_LEVELS_EXPANDED_STORAGE_KEY,
  );
  const collapsed = !expanded;
  const { isLocked: storageLocked } = useStorageAccess();
  const summary = useMemo(() => summarizeBinLevels(levels), [levels]);
  const canResetAutoAssignedRules = !!sets.find((set) => set.isActive)
    ?.autoAssignField;

  if (levels.length === 0) return null;

  const toggleCollapsed = () => setExpanded(!expanded);

  return (
    <div className="flex-none overflow-hidden rounded-card bg-card">
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left"
        >
          <p className="text-xs font-medium text-foreground/70">
            {t("binStatusMeter.heading")}
          </p>
          {collapsed && (
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
              <span className="truncate">
                {summary.fullest
                  ? t("binStatusMeter.summaryFullest", {
                      count: summary.totalCards,
                      bin: summary.fullest.binNumber,
                      percent: summary.fullest.percent,
                    })
                  : t("binStatusMeter.summaryTotal", {
                      count: summary.totalCards,
                    })}
              </span>
              {summary.needsEmptying > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 font-medium text-warning-foreground">
                  <IconAlertTriangle
                    className="size-3.5"
                    role="img"
                    aria-label={t("a11y.binsNeedingEmptying")}
                  />
                  {summary.needsEmptying}
                </span>
              )}
            </span>
          )}
          <IconChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-foreground/70 transition-transform",
              !collapsed && "rotate-180",
            )}
            aria-label={
              collapsed
                ? t("binStatusMeter.expand")
                : t("binStatusMeter.collapse")
            }
          />
        </button>
        {!collapsed && (
          <Button
            type="button"
            variant="ghost"
            className="mr-1.5"
            disabled={summary.totalCards === 0}
            onClick={() => {
              setResetAutoAssignedRules(true);
              setConfirmAll(true);
            }}
          >
            <IconTrash />
            {t("binStatusMeter.emptyAll")}
          </Button>
        )}
      </div>

      {!collapsed && <BinLevelGrid />}

      <EmptyAllBinsDialog
        open={confirmAll && !storageLocked}
        bins={levels.filter((level) => level.count > 0)}
        preferLocation={!!selectedSet?.isChaosMode}
        collectionGuid={activeCollection?.guid}
        canResetAutoAssignedRules={canResetAutoAssignedRules}
        onOpenChange={setConfirmAll}
        onConfirm={(options) =>
          emptyAllBins(
            levels.map((level) => level.binNumber),
            options,
          )
        }
      />

      <DeleteDialog
        open={confirmAll && storageLocked}
        onOpenChange={setConfirmAll}
        title={t("binStatusMeter.emptyAllTitle")}
        description={t("binStatusMeter.emptyAllDescription", {
          count: summary.totalCards,
        })}
        confirmLabel={t("binStatusMeter.emptyAllConfirm")}
        focusConfirm
        onConfirm={() => {
          void emptyAllBins(levels.map((level) => level.binNumber), {
            resetAutoAssignedRules:
              canResetAutoAssignedRules && resetAutoAssignedRules,
          });
        }}
      >
        {canResetAutoAssignedRules && (
          <ResetAutoAssignToggle
            checked={resetAutoAssignedRules}
            onCheckedChange={setResetAutoAssignedRules}
          />
        )}
      </DeleteDialog>

    </div>
  );
}
