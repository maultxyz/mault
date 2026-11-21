import { Callout } from "@/components/callout";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  fulfilOrder,
  orderQueryOptions,
  updateOrder,
} from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { useOrderPickProgress } from "@/features/business/api/use-order-pick-progress";
import { OrderPhonePickDialog } from "@/features/business/components/order-phone-pick-dialog";
import { PickContainerView } from "@/features/business/components/pick-container-view";
import { PickFocusView } from "@/features/business/components/pick-focus-view";
import { PickSortPresetDialog } from "@/features/business/components/pick-sort-preset-dialog";
import { PickSorterPickDialog } from "@/features/business/components/pick-sorter-pick-dialog";
import { PickSortView } from "@/features/business/components/pick-sort-view";
import { PickWalkNextUp } from "@/features/business/components/pick-walk-next-up";
import { PickWalkStopList } from "@/features/business/components/pick-walk-stop-list";
import {
  clearActivePickBatch,
  writeActivePickBatch,
} from "@/features/business/lib/active-pick-batch";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ViewTabs } from "@/components/view-tabs";
import {
  packingSlipsPath,
  PICKS_PATH,
  picksPath,
} from "@/lib/constants/business";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import type {
  BatchPickView,
  OrderBatchPickProps,
  PickSortGroup,
} from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  buildPickWalk,
  fullyPickedOrders,
  IMPLICIT_ORDER_REF,
  pickWalkStops,
  toOrderLineInput,
  type PickWalkEntry,
  type PickWalkStop,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconArrowsSort,
  IconDeviceMobile,
  IconInfoCircle,
  IconPackageExport,
  IconPrinter,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function OrderBatchPick({ orderGuids }: OrderBatchPickProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { access } = useBusinessAccess();
  const run = useBusinessAction();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [phonePickOpen, setPhonePickOpen] = useState(false);
  const [missingEntry, setMissingEntry] = useState<PickWalkEntry | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [sorterPickStop, setSorterPickStop] = useState<PickWalkStop | null>(
    null,
  );
  const [sortPresetOpen, setSortPresetOpen] = useState(false);
  const [view, setView] = useState<BatchPickView>("pick");
  const orderQueries = useQueries({
    queries: orderGuids.map((orderGuid) => orderQueryOptions(orderGuid)),
  });

  const orders = orderQueries.flatMap((query) => (query.data ? [query.data] : []));
  const openOrders = orders.filter((order) => order.status === "open");
  const pickProgress = useOrderPickProgress(openOrders);
  const pickedSet = pickProgress.pickedScanIds;
  const closedOrders = orders.filter((order) => order.status !== "open");
  const shortOrders = openOrders.filter((order) =>
    order.lines.some((line) => line.allocations.length < line.quantity),
  );
  const entries = buildPickWalk(openOrders);
  const completedOrders = fullyPickedOrders(openOrders, pickedSet);
  const pickedCount = entries.filter((entry) => pickedSet.has(entry.scanId)).length;
  const nextEntry =
    entries.find((entry) => !pickedSet.has(entry.scanId)) ?? null;
  const canAct = access?.canFulfilOrders ?? false;
  const isPending = orderQueries.some((query) => query.isPending);
  const failedQuery = orderQueries.find((query) => query.isError);
  const showOrderName = openOrders.length > 1;
  const missingOrder = missingEntry
    ? openOrders.find((order) => order.guid === missingEntry.orderGuid)
    : undefined;

  useEffect(() => {
    writeActivePickBatch(orderGuids);
  }, [orderGuids]);

  useEffect(() => {
    if (orders.length > 0 && openOrders.length === 0) clearActivePickBatch();
  }, [orders, openOrders.length]);

  const completePicks = async () => {
    setIsCompleting(true);
    const completedScanIds: string[] = [];
    for (const order of completedOrders) {
      const scanIds = order.pullSheet.map((entry) => entry.scanId);
      const result = await run(() => fulfilOrder(order.guid, { scanIds }));
      if (result) completedScanIds.push(...scanIds);
    }
    setIsCompleting(false);
    setCompleteOpen(false);
    const completedCount = completedOrders.filter((order) =>
      order.pullSheet.every((entry) => completedScanIds.includes(entry.scanId)),
    ).length;
    if (completedCount > 0) {
      toast.success(t("orders.batch.completed", { count: completedCount }));
    }
    if (completedCount === openOrders.length) clearActivePickBatch();
  };

  const releaseMissing = async () => {
    if (!missingEntry || !missingOrder) return;
    setIsReleasing(true);
    const result = await run(
      () =>
        updateOrder(missingOrder.guid, {
          name: missingOrder.name,
          lines: missingOrder.lines.map(toOrderLineInput),
          releasedScanIds: [missingEntry.scanId],
        }),
    );
    setIsReleasing(false);
    setMissingEntry(null);
    if (result) {
      toast.success(
        t("orders.pickWalk.missingReleased", { count: 1 }),
      );
    }
  };

  const title = t("orders.batch.title");
  const description = t("orders.batch.description", {
    picks: openOrders.length,
    cards: entries.length,
  });
  const actions = (
    <>
      {canAct && !isMobile && (
        <Button
          variant="outline"
          disabled={entries.length === 0 || openOrders.length === 0}
          title={t("orders.batch.sortPresetHint")}
          onClick={() => setSortPresetOpen(true)}
        >
          <IconArrowsSort />
          {t("orders.batch.sortPresetButton")}
        </Button>
      )}
      {canAct && (
        <Button
          variant="outline"
          disabled={entries.length === 0}
          onClick={() => setPhonePickOpen(true)}
        >
          <IconDeviceMobile />
          {t("orders.phonePick.button")}
        </Button>
      )}
      {!isMobile && (
        <Button
          variant="outline"
          disabled={orders.length === 0}
          onClick={() => window.open(packingSlipsPath(orderGuids), "_blank")}
        >
          <IconPrinter />
          {t("orders.packingSlips.printAll")}
        </Button>
      )}
      {canAct && (
        <Button
          disabled={completedOrders.length === 0 || isCompleting}
          title={completedOrders.length === 0 ? t("orders.batch.completeHint") : undefined}
          onClick={() => setCompleteOpen(true)}
        >
          <IconPackageExport />
          {t("orders.batch.complete", { count: completedOrders.length })}
        </Button>
      )}
    </>
  );

  const progressText =
    entries.length > 0
      ? t("orders.pickWalk.progress", {
          picked: pickedCount,
          total: entries.length,
        })
      : null;

  const sortGroups = useMemo<PickSortGroup[]>(() => {
    const groups = new Map<string, PickSortGroup>();
    for (const entry of entries) {
      const key = `${entry.orderGuid}|${entry.orderRef ?? ""}`;
      let group = groups.get(key);
      if (!group) {
        const order = openOrders.find(
          (candidate) => candidate.guid === entry.orderGuid,
        );
        if (!order) continue;
        group = {
          key,
          orderGuid: entry.orderGuid,
          orderName: order.name,
          orderRef: entry.orderRef,
          binNumber:
            entry.orderRef == null
              ? (order.orderBins[IMPLICIT_ORDER_REF] ?? null)
              : (order.orderBins[entry.orderRef] ?? null),
          picked: [],
          total: 0,
        };
        groups.set(key, group);
      }
      group.total += 1;
      if (pickedSet.has(entry.scanId)) group.picked.push(entry);
    }
    return [...groups.values()];
  }, [entries, openOrders, pickedSet]);

  const walkStops = useMemo(() => pickWalkStops(entries), [entries]);

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
      {isMobile ? (
        <MobilePageHeader title={title} subtitle={description} backTo={PICKS_PATH}>
          {actions}
        </MobilePageHeader>
      ) : (
        <PageHeader
          title={title}
          description={description}
          backTo={PICKS_PATH}
          backLabel={t("orders.batch.back")}
          actions={actions}
        />
      )}
      <div className="flex flex-col gap-4 p-4 md:gap-3 md:px-3 md:py-2">
        {isPending ? (
          <ListSkeleton rows={8} />
        ) : failedQuery ? (
          <LoadErrorCallout
            message={t("errors.loadFailed")}
            onRetry={() => void failedQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={IconTruckDelivery}
            title={t("orders.batch.emptyTitle")}
            description={t("orders.batch.emptyDescription")}
          />
        ) : (
          <>
            {closedOrders.length > 0 && (
              <Callout icon={IconInfoCircle}>
                {t("orders.batch.closedSkipped", { count: closedOrders.length })}
              </Callout>
            )}
            {shortOrders.length > 0 && (
              <Callout variant="warning" icon={IconAlertTriangle}>
                <p>{t("orders.batch.shortPicks", { count: shortOrders.length })}</p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {shortOrders.map((order) => (
                    <li key={order.guid}>
                      <Link className="underline underline-offset-2" to={picksPath(order.guid)}>
                        {order.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            {progressText && (
              <div className="sticky top-0 z-10 -mx-4 border-b bg-background/80 px-4 py-2 backdrop-blur-2xl md:-mx-3 md:px-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium tabular-nums"
                      role="status"
                      aria-live="polite"
                    >
                      {progressText}
                    </p>
                    <div
                      className="mt-1 h-1 overflow-hidden rounded-sm bg-muted"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-sm bg-primary transition-[width] motion-reduce:transition-none"
                        style={{
                          width: `${(pickedCount / entries.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <ViewTabs<BatchPickView>
                    label={t("orders.batch.viewLabel")}
                    className="shrink-0 border-b-0"
                    items={[
                      { key: "list", label: t("orders.batch.listTab") },
                      { key: "pick", label: t("orders.batch.walkTab") },
                      { key: "focus", label: t("orders.batch.focusTab") },
                      { key: "box", label: t("orders.batch.boxTab") },
                      { key: "sort", label: t("orders.batch.sortTab") },
                    ]}
                    value={view}
                    onChange={setView}
                  />
                </div>
              </div>
            )}

            {view === "focus" && entries.length > 0 ? (
              <PickFocusView
                entries={entries}
                pickedScanIds={pickedSet}
                total={entries.length}
                pickedCount={pickedCount}
                complete={pickedCount === entries.length}
                showOrderName={showOrderName}
                canPick={canAct}
                isReleasing={isReleasing}
                onPick={(scanId) => pickProgress.changePicked([scanId], true)}
                onUnpick={(scanId) => pickProgress.changePicked([scanId], false)}
                onMissing={(entry) => setMissingEntry(entry)}
                onComplete={() => setCompleteOpen(true)}
                completedCount={completedOrders.length}
                onBack={() => setView("pick")}
              />
            ) : view === "sort" ? (
              <PickSortView
                groups={sortGroups}
                canPick={canAct}
                onUnpick={(scanId) => pickProgress.changePicked([scanId], false)}
              />
            ) : view === "box" ? (
              <PickContainerView
                stops={walkStops}
                pickedScanIds={pickedSet}
                canPick={canAct}
                onToggle={(scanId, isPicked) =>
                  pickProgress.changePicked([scanId], isPicked)
                }
                onSorterPick={setSorterPickStop}
              />
            ) : (
              <>
            {view === "pick" && nextEntry ? (
              <PickWalkNextUp
                entry={nextEntry}
                showOrderName={showOrderName}
                canPick={canAct}
                isReleasing={isReleasing}
                onPicked={() => pickProgress.changePicked([nextEntry.scanId], true)}
                onMissing={() => setMissingEntry(nextEntry)}
              />
            ) : view === "pick" ? (
              <Callout variant="success">
                {t("orders.pickWalk.allPicked")}
              </Callout>
            ) : null}

            <PickWalkStopList
              entries={entries}
              pickedScanIds={pickedSet}
              canPick={canAct}
              showOrderName={showOrderName}
              onToggle={(scanId, isPicked) =>
                pickProgress.changePicked([scanId], isPicked)
              }
              onMissing={(scanId) =>
                setMissingEntry(
                  entries.find((entry) => entry.scanId === scanId) ?? null,
                )
              }
              onSorterPick={setSorterPickStop}
            />

            {canAct && completedOrders.length > 0 && (
              <Button
                size="lg"
                disabled={isCompleting}
                onClick={() => setCompleteOpen(true)}
              >
                <IconPackageExport />
                {t("orders.batch.complete", { count: completedOrders.length })}
              </Button>
            )}
              </>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title={t("orders.batch.completeTitle", { count: completedOrders.length })}
        description={t("orders.batch.completeDescription", {
          count: completedOrders.length,
          names: completedOrders.map((order) => order.name).join(", "),
        })}
        confirmLabel={t("orders.batch.complete", { count: completedOrders.length })}
        cancelLabel={t("actions.back")}
        isPending={isCompleting}
        onConfirm={() => void completePicks()}
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
        onConfirm={() => void releaseMissing()}
      />
      <OrderPhonePickDialog
        open={phonePickOpen}
        onOpenChange={setPhonePickOpen}
        orderGuids={openOrders.map((order) => order.guid)}
      />
      <PickSorterPickDialog
        stop={sorterPickStop}
        orders={openOrders}
        onOpenChange={(open) => {
          if (!open) setSorterPickStop(null);
        }}
      />
      <PickSortPresetDialog
        open={sortPresetOpen}
        onOpenChange={setSortPresetOpen}
        orders={openOrders}
      />
    </div>
  );
}
