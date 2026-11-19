import { Button } from "@/components/ui/button";
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
  createPickRunSortPreset,
  previousSortPresetsQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import {
  useDiscardPickRunPresets,
  usePickRunProgress,
} from "@/features/business/lib/pick-run-progress";
import { PickSorterSelect } from "@/features/business/components/pick-sorter-select";
import { OrderRefLabel } from "@/features/business/components/order-ref-label";
import type { FulfilmentOrderDetail, OrderSortPreset } from "@magic-vault/shared";
import { orderSortRefsOf } from "@magic-vault/shared";
import { sortingRulesPresetPath } from "@/lib/constants/bins";
import { toast } from "@/lib/toast";
import {
  IconArrowsSort,
  IconBox,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface PickSortPresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: FulfilmentOrderDetail[];
}

interface SortPresetGroup {
  key: string;
  orderName: string;
  orderRef: string | null;
  binNumber: number | null;
  count: number;
}

export function PickSortPresetDialog({
  open,
  onOpenChange,
  orders,
}: PickSortPresetDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const discardPresets = useDiscardPickRunPresets();
  const [presets, setPresets] = useState<OrderSortPreset[]>([]);
  const [deviceGuid, setDeviceGuid] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const progress = usePickRunProgress(presets);

  useEffect(() => {
    if (!open) setPresets([]);
  }, [open]);

  const groups = useMemo<SortPresetGroup[]>(() => {
    if (!open) return [];
    const map = new Map<string, SortPresetGroup>();
    for (const order of orders) {
      for (const ref of orderSortRefsOf(order.lines)) {
        const binNumber = order.orderBins[ref] ?? null;
        const count = order.pullSheet.filter(
          (entry) => (entry.orderRef ?? "") === ref,
        ).length;
        const key = `${order.guid}|${ref}`;
        map.set(key, {
          key,
          orderName: order.name,
          orderRef: ref === "" ? null : ref,
          binNumber,
          count,
        });
      }
    }
    return [...map.values()];
  }, [open, orders]);

  const orderGuids = useMemo(
    () => orders.map((order) => order.guid),
    [orders],
  );
  const previousQuery = useQuery({
    ...previousSortPresetsQueryOptions(orderGuids),
    enabled: open && presets.length === 0,
  });
  const previous = previousQuery.data?.[0];

  const start = async (previousPresetGuid?: string) => {
    setIsPending(true);
    const result = await run(() =>
      createPickRunSortPreset(
        orderGuids,
        previousPresetGuid ? undefined : deviceGuid || undefined,
        previousPresetGuid,
      ),
    );
    setIsPending(false);
    if (!result?.data) return;
    void queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });
    setPresets(result.data.presets);
    const [firstPreset] = result.data.presets;
    toast.success(
      t("orders.sortPresetCreated", { count: result.data.presets.length }),
      firstPreset
        ? {
            action: {
              label: t("orders.openSortPreset"),
              onClick: () =>
                void navigate(sortingRulesPresetPath(firstPreset.guid)),
            },
          }
        : undefined,
    );
  };

  const discardRun = async () => {
    setIsDiscarding(true);
    const discardedOk = await discardPresets(presets);
    setIsDiscarding(false);
    if (!discardedOk) return;
    setPresets([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("orders.batch.sortTab")}</DialogTitle>
          <DialogDescription>
            {presets.length > 0
              ? t("orders.sorterPick.runPresetDescription")
              : t("orders.sorterPick.preparePresetDescription")}
          </DialogDescription>
        </DialogHeader>
        {presets.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {groups.map((group) => {
              const live =
                group.binNumber != null
                  ? progress?.binsByNumber.get(group.binNumber)
                  : undefined;
              return (
                <li
                  key={group.key}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 ring-1 ring-border"
                >
                  {group.binNumber != null ? (
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
                    {live && live.wanted > 0
                      ? t("orders.sorterPick.binProgress", {
                          found: live.found,
                          total: live.wanted,
                        })
                      : t("orders.sorterPick.orderCards", {
                          count: group.count,
                        })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            {previous && (
              <div
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5 ring-1 ring-border"
                title={t("orders.sorterPick.previousHint")}
              >
                <IconHistory className="size-4 shrink-0 text-foreground/70" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
                  {t("orders.sorterPick.previousTitle", {
                    name: previous.name,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 max-md:h-7 max-md:px-2"
                  disabled={isPending}
                  onClick={() => void start(previous.guid)}
                >
                  <IconHistory />
                  {t("orders.sorterPick.previousUse")}
                </Button>
              </div>
            )}
            <PickSorterSelect value={deviceGuid} onChange={setDeviceGuid} />
          </>
        )}
        {presets.length > 0 && progress && progress.wanted > 0 && (
          <p
            className={
              progress.complete
                ? "text-sm font-medium text-success-foreground"
                : "text-sm font-medium tabular-nums"
            }
            role="status"
            aria-live="polite"
          >
            {progress.complete
              ? t("orders.sorterPick.allSortedPreset")
              : t("orders.sorterPick.runProgress", {
                  found: progress.found,
                  total: progress.wanted,
                })}
          </p>
        )}
        <DialogFooter>
          {presets.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.back")}
            </Button>
          ) : (
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
          {presets.length === 0 ? (
            <Button
              type="button"
              disabled={isPending || orders.length === 0}
              title={t("orders.batch.sortPresetHint")}
              onClick={() => void start()}
            >
              <IconArrowsSort />
              {t("orders.sorterPick.startButton")}
            </Button>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)}>
              {t("orders.sorterPick.done")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
