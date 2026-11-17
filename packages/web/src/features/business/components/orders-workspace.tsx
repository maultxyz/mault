import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Button } from "@/components/ui/button";
import { ordersQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { OrderDetail } from "@/features/business/components/order-detail";
import { OrderList } from "@/features/business/components/order-list";
import { OrderSelectionBar } from "@/features/business/components/order-selection-bar";
import { useHotkeys } from "@/hooks/use-hotkeys";
import type { FulfilmentOrder } from "@magic-vault/shared";
import { useRef, useState } from "react";
import type { SelectToggleOptions } from "@/lib/interfaces/cards";
import { ORDER_PARAM, PICK_IMPORT_PATH } from "@/lib/constants/business";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import type { OrdersWorkspaceProps } from "@/lib/interfaces/business";
import { IconFileImport, IconTruckDelivery } from "@tabler/icons-react";
import { useServerPagedList } from "@/hooks/use-server-paged-list";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

export function OrdersWorkspace({ switcher }: OrdersWorkspaceProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParam = searchParams.get(ORDER_PARAM);
  const {
    items: orders,
    pagination,
    isLoading,
    isError,
    refetch,
  } = useServerPagedList(
    (request) => ordersQueryOptions(orgId, request),
    selectedParam,
  );
  const selectedGuid = isMobile
    ? (selectedParam ?? undefined)
    : (selectedParam ?? orders[0]?.guid);
  const [checkedOrders, setCheckedOrders] = useState<ReadonlyMap<string, FulfilmentOrder>>(
    new Map(),
  );
  const clearCheckedOrders = () => setCheckedOrders(new Map());
  useHotkeys({ clearSelection: checkedOrders.size > 0 ? clearCheckedOrders : undefined });
  const checkAnchorGuidRef = useRef<string | null>(null);
  const toggleOrderChecked = (orderGuid: string, { shiftKey }: SelectToggleOptions) => {
    const index = orders.findIndex((candidate) => candidate.guid === orderGuid);
    if (index === -1) return;
    const anchorIndex = orders.findIndex(
      (candidate) => candidate.guid === checkAnchorGuidRef.current,
    );
    checkAnchorGuidRef.current = orderGuid;
    const rangeOrders =
      shiftKey && anchorIndex !== -1 && anchorIndex !== index
        ? orders.slice(Math.min(anchorIndex, index), Math.max(anchorIndex, index) + 1)
        : [orders[index]];
    setCheckedOrders((previous) => {
      const shouldCheck = !previous.has(orderGuid);
      const next = new Map(previous);
      for (const order of rangeOrders) {
        if (shouldCheck) next.set(order.guid, order);
        else next.delete(order.guid);
      }
      return next;
    });
  };
  const checkedOrderGuids = new Set(checkedOrders.keys());

  const select = (guid: string | null) =>
    setSearchParams(guid ? { [ORDER_PARAM]: guid } : {}, { replace: true });

  const selectionBar = (className?: string) => (
    <OrderSelectionBar
      className={className}
      checkedOrders={[...checkedOrders.values()]}
      onClear={clearCheckedOrders}
      onOrdersDeleted={(orderGuids) => {
        if (selectedParam && orderGuids.includes(selectedParam)) select(null);
      }}
    />
  );

  if (isMobile) {
    if (selectedGuid) {
      return (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <MobilePageHeader
            title={t("views.picks")}
            onBack={() => select(null)}
          />
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto p-4",
              MOBILE_NAV_SCROLL_PADDING_CLASS,
            )}
          >
            <div className="flex flex-col gap-4 md:gap-2">
              {access?.isLocked && <BusinessUpgradeCallout />}
              <OrderDetail
                key={selectedGuid}
                guid={selectedGuid}
                onDeleted={() => select(null)}
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader
          title={t("views.picks")}
          actions={
            <Button
              variant="ghost"
              className={MOBILE_CIRCLE_BUTTON_CLASS}
              aria-label={t("orders.importButton")}
              disabled={access?.isLocked || !access?.canFulfilOrders}
              render={<Link to={PICK_IMPORT_PATH} />}
              nativeButton={false}
            >
              <IconFileImport />
            </Button>
          }
        />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            {switcher}
            {access?.isLocked && <BusinessUpgradeCallout />}
            <OrderList
              orders={orders}
              pagination={pagination}
              selectedGuid={selectedGuid}
              isLoading={isLoading}
              onSelect={select}
              checkedOrderGuids={checkedOrderGuids}
              onToggleOrderChecked={toggleOrderChecked}
            />
            {selectionBar()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-hidden border-r bg-sidebar/70 p-2 lg:col-span-3">
          {switcher}
          <Button
            variant="outline"
            className="w-full"
            disabled={access?.isLocked || !access?.canFulfilOrders}
            render={<Link to={PICK_IMPORT_PATH} />}
            nativeButton={false}
          >
            <IconFileImport />
            {t("orders.importButton")}
          </Button>
          <OrderList
            orders={orders}
            pagination={pagination}
            selectedGuid={selectedGuid}
            isLoading={isLoading}
            onSelect={select}
            checkedOrderGuids={checkedOrderGuids}
            onToggleOrderChecked={toggleOrderChecked}
          />
        </section>
        <section className="col-span-8 flex max-h-full flex-col gap-4 overflow-y-auto p-4 md:gap-2 md:px-3 md:py-2 lg:col-span-9">
          {access?.isLocked && <BusinessUpgradeCallout />}
          {selectedGuid ? (
            <OrderDetail
              key={selectedGuid}
              guid={selectedGuid}
              onDeleted={() => select(null)}
            />
          ) : (
            <h1 className="sr-only">{t("views.picks")}</h1>
          )}
          {!selectedGuid && isError && (
            <LoadErrorCallout
              message={t("errors.loadFailed")}
              onRetry={refetch}
            />
          )}
          {!selectedGuid && !isLoading && !isError && (
            <EmptyState
              icon={IconTruckDelivery}
              title={t("orders.pickTitle")}
              description={t("orders.pickDescription")}
            />
          )}
          {selectionBar("mt-auto mb-0")}
        </section>
      </div>
    </div>
  );
}
