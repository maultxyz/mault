import { Callout } from "@/components/callout";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import { fulfilOrder, orderQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess, useBusinessAction } from "@/features/business/api/use-business";
import { OrderPickByLocation } from "@/features/business/components/order-pick-by-location";
import { buildBatchPullSheet, fullyPickedOrders } from "@/features/business/lib/pick-batch";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  EMPTY_PICKS,
  packingSlipsPath,
  PICKS_PATH,
  picksPath,
} from "@/lib/constants/business";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import type { OrderBatchPickProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { orderPicksSchema, type OrderPicksFormValues } from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconPackageExport,
  IconPrinter,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function OrderBatchPick({ orderGuids }: OrderBatchPickProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { access } = useBusinessAccess();
  const run = useBusinessAction();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const orderQueries = useQueries({
    queries: orderGuids.map((orderGuid) => orderQueryOptions(orderGuid)),
  });
  const form = useForm<OrderPicksFormValues>({
    resolver: zodResolver(orderPicksSchema),
    defaultValues: EMPTY_PICKS,
  });
  const picked = useWatch({ control: form.control, name: "picked" });
  const pickedSet = new Set(picked);
  const isDirty = picked.length > 0;
  const discardPicks = () => form.reset(EMPTY_PICKS, DISCARD_RESET_OPTIONS);

  const orders = orderQueries.flatMap((query) => (query.data ? [query.data] : []));
  const openOrders = orders.filter((order) => order.status === "open");
  const closedOrders = orders.filter((order) => order.status !== "open");
  const shortOrders = openOrders.filter((order) =>
    order.lines.some((line) => line.allocations.length < line.quantity),
  );
  const entries = buildBatchPullSheet(openOrders);
  const orderByGuid = new Map(openOrders.map((order) => [order.guid, order]));
  const orderGuidByScanId = new Map(entries.map((entry) => [entry.scanId, entry.orderGuid]));
  const completedOrders = fullyPickedOrders(openOrders, pickedSet);
  const canAct = access?.canFulfilOrders ?? false;
  const isPending = orderQueries.some((query) => query.isPending);
  const failedQuery = orderQueries.find((query) => query.isError);

  const changePicked = (scanIds: string[], isPicked: boolean) =>
    form.setValue(
      "picked",
      [...picked.filter((id) => !scanIds.includes(id)), ...(isPicked ? scanIds : [])],
      { shouldDirty: true },
    );

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
    form.reset({ picked: picked.filter((id) => !completedScanIds.includes(id)) });
  };

  const title = t("orders.batch.title");
  const description = t("orders.batch.description", {
    picks: openOrders.length,
    cards: entries.length,
  });
  const actions = (
    <>
      <Button
        variant="outline"
        disabled={orders.length === 0}
        onClick={() => window.open(packingSlipsPath(orderGuids), "_blank")}
      >
        <IconPrinter />
        {t("orders.packingSlips.printAll")}
      </Button>
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
      <div className="flex flex-col gap-4 p-4 md:gap-2 md:px-3 md:py-2">
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
            <p role="status" className="text-xs text-foreground/70">
              {t("orders.batch.progress", {
                picked: entries.filter((entry) => pickedSet.has(entry.scanId)).length,
                total: entries.length,
                completed: completedOrders.length,
              })}
            </p>
            <OrderPickByLocation
              entries={entries}
              orderBinOf={(entry) => {
                const order = orderByGuid.get(orderGuidByScanId.get(entry.scanId) ?? "");
                return entry.orderRef == null || !order
                  ? null
                  : (order.orderBins[entry.orderRef] ?? null);
              }}
              pickNameOf={(entry) =>
                orderByGuid.get(orderGuidByScanId.get(entry.scanId) ?? "")?.name ?? ""
              }
              pickedScanIds={pickedSet}
              canPick={canAct}
              onPickedChange={changePicked}
            />
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
      <UnsavedChangesGuard isDirty={isDirty} onDiscard={discardPicks} />
    </div>
  );
}
