import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import { BaseProviders } from "@/app/providers";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { orderQueryOptions } from "@/features/business/api/business";
import { PackingSlip } from "@/features/business/components/packing-slip";
import { buildPackingSlips } from "@/features/business/lib/packing-slips";
import { useOrg } from "@/features/companies/api/use-organization";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { ORDER_PARAM } from "@/lib/constants/business";
import { IconPackage, IconPrinter } from "@tabler/icons-react";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function PackingSlips() {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const [searchParams] = useSearchParams();
  const [showsPrices, setShowsPrices] = useState(true);
  const orderQueries = useQueries({
    queries: searchParams.getAll(ORDER_PARAM).map((orderGuid) => orderQueryOptions(orderGuid)),
  });
  const isPending = orderQueries.some((query) => query.isPending);
  const failedQuery = orderQueries.find((query) => query.isError);
  const slips = orderQueries.flatMap((query) => (query.data ? buildPackingSlips(query.data) : []));
  const shopName = activeOrg?.name ?? t("orders.packingSlips.title");

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="min-h-dvh bg-background text-foreground outline-none print:bg-white"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6 md:gap-2 print:max-w-none print:gap-0 print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className={PAGE_TITLE_CLASS}>{t("orders.packingSlips.pageTitle")}</h1>
            <p className="text-sm text-foreground/70">
              {t("orders.packingSlips.count", { count: slips.length })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Switch checked={showsPrices} onCheckedChange={setShowsPrices} />
              {t("orders.packingSlips.showPrices")}
            </Label>
            <Button disabled={slips.length === 0} onClick={() => window.print()}>
              <IconPrinter />
              {t("orders.packingSlips.printButton")}
            </Button>
          </div>
        </div>
        {isPending ? (
          <ListSkeleton rows={10} />
        ) : failedQuery ? (
          <LoadErrorCallout
            message={t("errors.loadFailed")}
            onRetry={() => void failedQuery.refetch()}
          />
        ) : slips.length === 0 ? (
          <EmptyState
            icon={IconPackage}
            title={t("orders.packingSlips.emptyTitle")}
            description={t("orders.packingSlips.emptyDescription")}
          />
        ) : (
          slips.map((slip) => (
            <PackingSlip key={slip.key} slip={slip} shopName={shopName} showsPrices={showsPrices} />
          ))
        )}
      </div>
    </main>
  );
}

export default function PackingSlipsPage() {
  return (
    <BaseProviders>
      <PackingSlips />
    </BaseProviders>
  );
}
