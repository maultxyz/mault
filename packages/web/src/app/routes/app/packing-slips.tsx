import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import { BaseProviders } from "@/app/providers";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { orderQueryOptions } from "@/features/business/api/business";
import {
  shopPhotoQueryOptions,
} from "@/features/business/api/shop-catalogs";
import { PackingSlip } from "@/features/business/components/packing-slip";
import {
  buildPackingSlips,
  readPackingSlipPrintOptions,
  writePackingSlipPrintOptions,
  type PackingSlipPrintOptions,
} from "@/features/business/lib/packing-slips";
import { useOrg } from "@/features/companies/api/use-organization";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { ORDER_PARAM } from "@/lib/constants/business";
import {
  PACKING_SLIP_SKELETON_COLUMNS,
  PACKING_SLIP_SKELETON_ROWS,
  PACKING_SLIPS_SKELETON_COUNT,
} from "@/lib/constants/skeletons";
import { IconPackage, IconPrinter } from "@tabler/icons-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function PackingSlips() {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const [searchParams] = useSearchParams();
  const [options, setOptions] = useState<PackingSlipPrintOptions>(
    () => readPackingSlipPrintOptions(),
  );
  const shopPhoto = useQuery({
    ...shopPhotoQueryOptions(activeOrg?.id),
    staleTime: Infinity,
  });
  const logoUrl = shopPhoto.data?.url ?? null;
  const orderQueries = useQueries({
    queries: searchParams.getAll(ORDER_PARAM).map((orderGuid) => orderQueryOptions(orderGuid)),
  });
  const isPending = orderQueries.some((query) => query.isPending);
  const failedQuery = orderQueries.find((query) => query.isError);
  const slips = orderQueries.flatMap((query) => (query.data ? buildPackingSlips(query.data) : []));
  const shopName = activeOrg?.name ?? t("orders.packingSlips.title");

  useEffect(() => {
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "@media print { @page { margin: 0; } }";
    document.head.appendChild(pageStyle);
    return () => {
      pageStyle.remove();
    };
  }, []);

  const printTitle = slips.length > 0
    ? `${t("orders.packingSlips.pageTitle")} ${[...new Set(slips.map((slip) => slip.pickName))].join(", ")}`
    : t("orders.packingSlips.pageTitle");
  useEffect(() => {
    const previousTitle = document.title;
    document.title = printTitle;
    return () => {
      document.title = previousTitle;
    };
  }, [printTitle]);

  const changeOption = (key: keyof PackingSlipPrintOptions, value: boolean) => {
    setOptions((current) => {
      const next = { ...current, [key]: value };
      writePackingSlipPrintOptions(next);
      return next;
    });
  };

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
              <Switch
                checked={options.showsImages}
                onCheckedChange={(checked) => changeOption("showsImages", checked)}
              />
              {t("orders.packingSlips.showImages")}
            </Label>
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Switch
                checked={options.showsPrices}
                onCheckedChange={(checked) => changeOption("showsPrices", checked)}
              />
              {t("orders.packingSlips.showPrices")}
            </Label>
            <Button disabled={slips.length === 0} onClick={() => window.print()}>
              <IconPrinter />
              {t("orders.packingSlips.printButton")}
            </Button>
          </div>
        </div>
        {isPending ? (
          <SkeletonStatus className="flex flex-col gap-4 md:gap-2">
            {Array.from({
              length: Math.min(orderQueries.length, PACKING_SLIPS_SKELETON_COUNT),
            }).map((_, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-card bg-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="size-8 shrink-0 rounded-md" />
                    <div className="flex flex-col">
                      <div className="flex h-7 items-center">
                        <Skeleton className="h-4 w-36" />
                      </div>
                      <div className="flex h-5 items-center">
                        <Skeleton className="h-3.5 w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                </div>
                <TableSkeleton
                  columns={PACKING_SLIP_SKELETON_COLUMNS}
                  rows={PACKING_SLIP_SKELETON_ROWS}
                />
                <div className="ml-auto flex w-full max-w-xs justify-between">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              </div>
            ))}
          </SkeletonStatus>
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
            <PackingSlip
              key={slip.key}
              slip={slip}
              shopName={shopName}
              showsPrices={options.showsPrices}
              showsImages={options.showsImages}
              logoUrl={logoUrl}
            />
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
