import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Button } from "@/components/ui/button";
import { ordersQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { OrderDetail } from "@/features/business/components/order-detail";
import { OrderList } from "@/features/business/components/order-list";
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
  const { t: tCommon } = useTranslation("common");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParam = searchParams.get(ORDER_PARAM);
  const {
    items: orders,
    pagination,
    isLoading,
  } = useServerPagedList(
    (request) => ordersQueryOptions(orgId, request),
    selectedParam,
  );
  const selectedGuid = isMobile
    ? (selectedParam ?? undefined)
    : (selectedParam ?? orders[0]?.guid);

  const select = (guid: string | null) =>
    setSearchParams(guid ? { [ORDER_PARAM]: guid } : {}, { replace: true });

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
          title={tCommon("nav.intake")}
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
            />
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
          {!selectedGuid && !isLoading && (
            <EmptyState
              icon={IconTruckDelivery}
              title={t("orders.pickTitle")}
              description={t("orders.pickDescription")}
            />
          )}
        </section>
      </div>
    </div>
  );
}
