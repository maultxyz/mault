import { Callout } from "@/components/callout";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ViewTabs } from "@/components/view-tabs";
import { updateOrder } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { PickContainerView } from "@/features/business/components/pick-container-view";
import { PickFocusView } from "@/features/business/components/pick-focus-view";
import { PickSorterPickDialog } from "@/features/business/components/pick-sorter-pick-dialog";
import { PickSortView } from "@/features/business/components/pick-sort-view";
import { PickWalkNextUp } from "@/features/business/components/pick-walk-next-up";
import { PickWalkStopList } from "@/features/business/components/pick-walk-stop-list";
import type {
  PickSortGroup,
  PickWalkWorkspaceProps,
  PickWalkWorkspaceView,
} from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  buildPickWalk,
  IMPLICIT_ORDER_REF,
  pickWalkStops,
  toOrderLineInput,
  type PickWalkEntry,
  type PickWalkStop,
} from "@magic-vault/shared";
import { IconPackageExport } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function PickWalkWorkspace({
  orders,
  pickedScanIds,
  onPickedChange,
  canPick,
  completedCount,
  completeLabel,
  isCompleting,
  onComplete,
  headingLevel,
  isProgressSticky = true,
  linesView,
  showsCompleteBelowCards = true,
}: PickWalkWorkspaceProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const isMobile = useIsMobile();
  const [view, setView] = useState<PickWalkWorkspaceView>("pick");
  const [missingEntry, setMissingEntry] = useState<PickWalkEntry | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [sorterPickStop, setSorterPickStop] = useState<PickWalkStop | null>(null);

  const entries = useMemo(() => buildPickWalk(orders), [orders]);
  const walkStops = useMemo(() => pickWalkStops(entries), [entries]);
  const pickedCount = entries.filter((entry) => pickedScanIds.has(entry.scanId)).length;
  const nextEntry = entries.find((entry) => !pickedScanIds.has(entry.scanId)) ?? null;
  const showOrderName = orders.length > 1;
  const missingOrder = missingEntry
    ? orders.find((order) => order.guid === missingEntry.orderGuid)
    : undefined;

  const sortGroups = useMemo<PickSortGroup[]>(() => {
    const groups = new Map<string, PickSortGroup>();
    for (const entry of entries) {
      const key = `${entry.orderGuid}|${entry.orderRef ?? ""}`;
      let group = groups.get(key);
      if (!group) {
        const order = orders.find((candidate) => candidate.guid === entry.orderGuid);
        if (!order) continue;
        group = {
          key,
          orderGuid: entry.orderGuid,
          orderName: order.name,
          orderRef: entry.orderRef,
          binNumber: order.orderBins[entry.orderRef ?? IMPLICIT_ORDER_REF] ?? null,
          picked: [],
          total: 0,
        };
        groups.set(key, group);
      }
      group.total += 1;
      if (pickedScanIds.has(entry.scanId)) group.picked.push(entry);
    }
    return [...groups.values()];
  }, [entries, orders, pickedScanIds]);

  const releaseMissing = async () => {
    if (!missingEntry || !missingOrder) return;
    setIsReleasing(true);
    const result = await run(() =>
      updateOrder(missingOrder.guid, {
        name: missingOrder.name,
        lines: missingOrder.lines.map(toOrderLineInput),
        releasedScanIds: [missingEntry.scanId],
      }),
    );
    setIsReleasing(false);
    setMissingEntry(null);
    if (result) {
      toast.success(t("orders.pickWalk.missingReleased", { count: 1 }));
    }
  };

  const viewItems: { key: PickWalkWorkspaceView; label: string }[] = [
    { key: "list", label: t("orders.batch.listTab") },
    { key: "pick", label: t("orders.batch.walkTab") },
    { key: "focus", label: t("orders.batch.focusTab") },
    { key: "box", label: t("orders.batch.boxTab") },
    { key: "sort", label: t("orders.batch.sortTab") },
    ...(linesView ? [{ key: "lines" as const, label: linesView.label }] : []),
  ];

  const viewHintKey =
    view === "sort" && canPick && !isMobile ? "sortWithSorter" : view;

  const completeButton = canPick && completedCount > 0 && (
    <Button size="lg" disabled={isCompleting} onClick={onComplete}>
      <IconPackageExport />
      {completeLabel ?? t("orders.batch.complete", { count: completedCount })}
    </Button>
  );

  return (
    <>
      <div
        className={cn(
          isProgressSticky &&
            "sticky top-0 z-10 -mx-4 border-b bg-background/80 px-4 py-2 backdrop-blur-2xl md:-mx-3 md:px-3",
        )}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium tabular-nums" role="status" aria-live="polite">
              {t("orders.pickWalk.progress", { picked: pickedCount, total: entries.length })}
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-sm bg-muted" aria-hidden>
              <div
                className="h-full rounded-sm bg-primary transition-[width] motion-reduce:transition-none"
                style={{
                  width: `${entries.length > 0 ? (pickedCount / entries.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <ViewTabs<PickWalkWorkspaceView>
            label={t("orders.batch.viewLabel")}
            className="shrink-0 border-b-0"
            dataTour="pick-views"
            items={viewItems}
            value={view}
            onChange={setView}
          />
        </div>
      </div>
      <p className="text-xs text-foreground/70">
        {t(`orders.batch.viewHints.${viewHintKey}`)}
      </p>

      {view === "lines" && linesView ? (
        linesView.content
      ) : view === "focus" && entries.length > 0 ? (
        <PickFocusView
          entries={entries}
          pickedScanIds={pickedScanIds}
          complete={pickedCount === entries.length}
          showOrderName={showOrderName}
          canPick={canPick}
          isReleasing={isReleasing}
          onPick={(scanId) => onPickedChange([scanId], true)}
          onUnpick={(scanId) => onPickedChange([scanId], false)}
          onMissing={setMissingEntry}
          onComplete={onComplete}
          completedCount={completedCount}
          completeLabel={completeLabel}
        />
      ) : view === "sort" ? (
        <PickSortView
          groups={sortGroups}
          canPick={canPick}
          onUnpick={(scanId) => onPickedChange([scanId], false)}
        />
      ) : view === "box" ? (
        <PickContainerView
          stops={walkStops}
          pickedScanIds={pickedScanIds}
          canPick={canPick}
          onToggle={(scanId, isPicked) => onPickedChange([scanId], isPicked)}
          onSorterPick={setSorterPickStop}
        />
      ) : (
        <>
          {view === "pick" && nextEntry ? (
            <PickWalkNextUp
              entry={nextEntry}
              showOrderName={showOrderName}
              canPick={canPick}
              isReleasing={isReleasing}
              onPicked={() => onPickedChange([nextEntry.scanId], true)}
              onMissing={() => setMissingEntry(nextEntry)}
            />
          ) : view === "pick" ? (
            <Callout variant="success">{t("orders.pickWalk.allPicked")}</Callout>
          ) : null}
          <PickWalkStopList
            entries={entries}
            pickedScanIds={pickedScanIds}
            canPick={canPick}
            showOrderName={showOrderName}
            headingLevel={headingLevel}
            onToggle={(scanId, isPicked) => onPickedChange([scanId], isPicked)}
            onMissing={(scanId) =>
              setMissingEntry(entries.find((entry) => entry.scanId === scanId) ?? null)
            }
            onSorterPick={setSorterPickStop}
          />
          {showsCompleteBelowCards && completeButton}
        </>
      )}

      <ConfirmDialog
        open={missingEntry != null}
        onOpenChange={(open) => {
          if (!open) setMissingEntry(null);
        }}
        title={t("orders.pickWalk.missingTitle", { name: missingEntry?.card.name ?? "" })}
        description={t("orders.pickWalk.missingDescription")}
        confirmLabel={t("orders.pickWalk.missingConfirm")}
        cancelLabel={t("actions.back")}
        isPending={isReleasing}
        onConfirm={() => void releaseMissing()}
      />
      <PickSorterPickDialog
        stop={sorterPickStop}
        orders={orders}
        onOpenChange={(open) => {
          if (!open) setSorterPickStop(null);
        }}
      />
    </>
  );
}
