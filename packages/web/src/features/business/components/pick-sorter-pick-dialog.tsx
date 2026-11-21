import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import {
  applySorterPickRun,
  cleanupUsedPresets,
  createSorterPickRun,
  releaseSorterPickMissing,
} from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import {
  useDiscardPickRunPresets,
  usePickRunProgress,
} from "@/features/business/lib/pick-run-progress";
import { OrderRefLabel } from "@/features/business/components/order-ref-label";
import { PickSorterSelect } from "@/features/business/components/pick-sorter-select";
import type { PickSorterPickDialogProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import {
  IMPLICIT_ORDER_REF,
  type OrderSortPreset,
  type PickWalkEntry,
  type SorterPickApplyResult,
} from "@magic-vault/shared";
import {
  IconArrowsSort,
  IconBox,
  IconEyeOff,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface SorterPickGroup {
  key: string;
  orderName: string;
  orderRef: string | null;
  binNumber: number | null;
  count: number;
}

export function PickSorterPickDialog({
  stop,
  orders,
  onOpenChange,
}: PickSorterPickDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const queryClient = useQueryClient();
  const discardPresets = useDiscardPickRunPresets();
  const [presets, setPresets] = useState<OrderSortPreset[]>([]);
  const [applied, setApplied] = useState<SorterPickApplyResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [missingEntry, setMissingEntry] = useState<PickWalkEntry | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [deviceGuid, setDeviceGuid] = useState("");
  const open = stop != null;
  const locationName = stop?.locationName ?? "";
  const locationGuid = stop?.locationGuid ?? null;
  const stopKey = stop?.stopKey ?? null;

  const usedPresetsQuery = useQuery({ ...binsQueryOptions, enabled: open });
  const usedPresetCount =
    usedPresetsQuery.data?.filter((set) => set.skipSaving && !set.isActive)
      .length ?? 0;
  const progress = usePickRunProgress(presets);

  useEffect(() => {
    setPresets([]);
    setApplied(null);
    setMissingEntry(null);
  }, [stopKey]);

  const groups = useMemo<SorterPickGroup[]>(() => {
    if (!stop) return [];
    const map = new Map<string, SorterPickGroup>();
    for (const entry of stop.entries) {
      const key = `${entry.orderGuid}|${entry.orderRef ?? ""}`;
      const order = orders.find(
        (candidate) => candidate.guid === entry.orderGuid,
      );
      const group = map.get(key) ?? {
        key,
        orderName: order?.name ?? entry.orderName,
        orderRef: entry.orderRef,
        binNumber:
          entry.orderRef == null
            ? (order?.orderBins[IMPLICIT_ORDER_REF] ?? null)
            : (order?.orderBins[entry.orderRef] ?? null),
        count: 0,
      };
      group.count += 1;
      map.set(key, group);
    }
    return [...map.values()];
  }, [stop, orders]);

  const orderGuids = useMemo(() => orders.map((order) => order.guid), [orders]);
  const binCount = orders[0]?.binCount ?? 0;

  // after applying, the box's cards that are still unpicked weren't found
  const missingEntries = useMemo<PickWalkEntry[]>(() => {
    if (!stop || !applied) return [];
    return stop.entries.filter((entry) => {
      const order = orders.find(
        (candidate) => candidate.guid === entry.orderGuid,
      );
      const sheetEntry = order?.pullSheet.find(
        (candidate) => candidate.scanId === entry.scanId,
      );
      return sheetEntry != null && !sheetEntry.picked;
    });
  }, [stop, orders, applied]);

  const releaseMissing = async (entry: PickWalkEntry) => {
    setIsReleasing(true);
    const result = await run(() =>
      releaseSorterPickMissing({
        orderGuid: entry.orderGuid,
        scanId: entry.scanId,
      }),
    );
    setIsReleasing(false);
    setMissingEntry(null);
    if (result) {
      toast.success(t("orders.pickWalk.missingReleased", { count: 1 }));
    }
  };

  const startRun = async () => {
    if (!locationGuid) return;
    setIsPending(true);
    const result = await run(() =>
      createSorterPickRun(orderGuids, locationGuid, deviceGuid || undefined),
    );
    setIsPending(false);
    if (!result?.data) return;
    void queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });
    setPresets(result.data.presets);
  };

  const applyRun = async () => {
    if (!locationGuid) return;
    setIsPending(true);
    const result = await run(() =>
      applySorterPickRun({
        orderGuids,
        locationGuid,
        presetGuids: presets.map((preset) => preset.guid),
      }),
    );
    setIsPending(false);
    if (!result?.data) return;
    setApplied(result.data);
    toast.success(
      t("orders.sorterPick.applied", {
        count: Object.values(result.data.pickedByOrder).reduce(
          (sum, scanIds) => sum + scanIds.length,
          0,
        ),
      }),
    );
  };

  const discardRun = async () => {
    setIsDiscarding(true);
    const discardedOk = await discardPresets(presets);
    setIsDiscarding(false);
    if (!discardedOk) return;
    // back to the prepare state so another box can be run right away
    setPresets([]);
    setApplied(null);
  };

  const cleanupUsed = async () => {
    setIsCleaningUp(true);
    const result = await run(() => cleanupUsedPresets());
    setIsCleaningUp(false);
    setCleanupOpen(false);
    if (!result?.data) return;
    void queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });
    toast.success(
      t("orders.sorterPick.cleanedUp", { count: result.data.removed }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("orders.sorterPick.title", { location: locationName })}
          </DialogTitle>
          <DialogDescription>
            {applied
              ? t("orders.sorterPick.appliedDescription", {
                  location: locationName,
                })
              : presets.length > 0
                ? t("orders.sorterPick.runDescription")
                : t("orders.sorterPick.prepareDescription")}
          </DialogDescription>
        </DialogHeader>
        {groups.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {groups.map((group) => (
              <li
                key={group.key}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 ring-1 ring-border"
              >
                {presets.length > 0 && group.binNumber != null ? (
                  <span
                    className="flex size-6 shrink-0 cursor-help items-center justify-center rounded-sm bg-primary/10 text-xs font-semibold tabular-nums text-primary"
                    title={t("orders.sorterPick.binHint", {
                      bin: group.binNumber,
                      order: group.orderName,
                    })}
                  >
                    {group.binNumber}
                  </span>
                ) : (
                  <IconBox className="size-4 shrink-0 text-foreground/70" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {group.orderName}
                </span>
                <span className="shrink-0 text-xs text-foreground/70">
                  {(() => {
                    if (presets.length === 0) {
                      return t("orders.sorterPick.orderCards", {
                        count: group.count,
                      });
                    }
                    const live =
                      group.binNumber != null
                        ? progress?.binsByNumber.get(group.binNumber)
                        : undefined;
                    if (live && live.wanted > 0) {
                      return t("orders.sorterPick.binProgress", {
                        found: live.found,
                        total: live.wanted,
                      });
                    }
                    return (
                      <OrderRefLabel
                        orderRef={group.orderRef}
                        binNumber={null}
                      />
                    );
                  })()}
                </span>
              </li>
            ))}
            {presets.length > 0 && binCount > 0 && (
              <li
                className="flex cursor-help items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5 ring-1 ring-border"
                title={t("orders.sorterPick.putBackBinHint", {
                  location: locationName,
                })}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-semibold tabular-nums text-foreground/70">
                  {binCount}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {t("orders.sorterPick.putBackBin", { location: locationName })}
                </span>
              </li>
            )}
          </ul>
        )}
        {presets.length === 0 && (
          <PickSorterSelect value={deviceGuid} onChange={setDeviceGuid} />
        )}
        {presets.length === 0 && usedPresetCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
            <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
              {t("orders.sorterPick.usedPresets", { count: usedPresetCount })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 max-md:h-7 max-md:px-2"
              title={t("orders.sorterPick.usedPresetsHint")}
              disabled={isCleaningUp}
              onClick={() => setCleanupOpen(true)}
            >
              <IconTrash />
              {t("orders.sorterPick.discardUsed")}
            </Button>
          </div>
        )}
        {presets.length > 0 && !applied && progress && progress.wanted > 0 && (
          <p
            className={progress.complete ? "text-sm font-medium text-success-foreground" : "text-sm font-medium tabular-nums"}
            role="status"
            aria-live="polite"
          >
            {progress.complete
              ? t("orders.sorterPick.allSorted")
              : t("orders.sorterPick.runProgress", {
                  found: progress.found,
                  total: progress.wanted,
                })}
          </p>
        )}
        {applied && (
          <p className="text-sm font-medium text-success-foreground" role="status">
            {t("orders.sorterPick.appliedHint")}
          </p>
        )}
        {applied && missingEntries.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg border bg-warning/5 p-2">
            <p className="text-xs font-medium text-warning-strong">
              {t("orders.sorterPick.missingCount", {
                count: missingEntries.length,
              })}
            </p>
            {missingEntries.map((entry) => (
              <div
                key={entry.scanId}
                className="flex items-center gap-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {entry.card.name}
                </span>
                <span className="shrink-0 text-xs text-foreground/70">
                  {entry.orderRef == null ? (
                    t("orders.noOrder")
                  ) : (
                    t("orders.orderRefLabel", { order: entry.orderRef })
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 max-md:h-7 max-md:px-2"
                  aria-label={t("orders.pickWalk.cantFindCard", {
                    name: entry.card.name,
                  })}
                  title={t("orders.pickWalk.cantFindCard", {
                    name: entry.card.name,
                  })}
                  onClick={() => setMissingEntry(entry)}
                >
                  <IconEyeOff />
                  {t("orders.pickWalk.cantFind")}
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          {!applied && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.back")}
            </Button>
          )}
          {presets.length > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={isDiscarding}
              title={t("orders.sorterPick.discardRunPresetHint")}
              onClick={() => void discardRun()}
            >
              <IconTrash />
              {t("orders.sorterPick.discardRunPreset")}
            </Button>
          )}
          {presets.length === 0 && (
            <Button
              type="button"
              disabled={isPending}
              title={t("orders.sorterPick.startButtonHint", {
                location: locationName,
              })}
              onClick={() => void startRun()}
            >
              <IconArrowsSort />
              {t("orders.sorterPick.startButton")}
            </Button>
          )}
          {presets.length > 0 && !applied && (
            <Button
              type="button"
              disabled={isPending}
              title={t("orders.sorterPick.applyButtonHint")}
              onClick={() => void applyRun()}
            >
              <IconArrowsSort />
              {t("orders.sorterPick.applyButton")}
            </Button>
          )}
          {applied && (
            <Button type="button" onClick={() => onOpenChange(false)}>
              {t("orders.sorterPick.done")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        title={t("orders.sorterPick.cleanupTitle", { count: usedPresetCount })}
        description={t("orders.sorterPick.cleanupDescription")}
        confirmLabel={t("orders.sorterPick.discardUsed")}
        cancelLabel={t("actions.back")}
        isPending={isCleaningUp}
        onConfirm={() => void cleanupUsed()}
      />
      <ConfirmDialog
        open={missingEntry != null}
        onOpenChange={(open) => {
          if (!open) setMissingEntry(null);
        }}
        title={t("orders.pickWalk.missingTitle", {
          name: missingEntry?.card.name ?? "",
        })}
        description={t("orders.pickWalk.missingDescription")}
        confirmLabel={t("orders.pickWalk.missingConfirm")}
        cancelLabel={t("actions.back")}
        isPending={isReleasing}
        onConfirm={() => void releaseMissing(missingEntry!)}
      />
    </Dialog>
  );
}
