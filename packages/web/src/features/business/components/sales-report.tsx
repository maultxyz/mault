import { Callout } from "@/components/callout";
import { BusinessTour } from "@/features/business/components/business-tour";
import { BUSINESS_SALES_TOUR } from "@/features/business/lib/business-tours";
import { CompactPrice } from "@/components/compact-value";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { MobileListSkeleton } from "@/components/mobile-list-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { TableSkeleton } from "@/components/table-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MissingPrice } from "@/components/missing-price";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadSalesReportCsv,
  intakeLotQueryOptions,
  salesReportQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessOverviewBackButton } from "@/features/business/components/business-overview-back-button";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { formatDateTime } from "@/features/business/lib/format";
import { salesReportFiltersFrom } from "@/features/business/lib/sales-report";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { downloadBlob } from "@/lib/download";
import {
  intakeLotPath,
  SALES_SKELETON_COLUMNS,
  SALES_TABLE_SKELETON_ROWS,
} from "@/lib/constants/business";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_LIST_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import type {
  SaleMoneyProps,
  SaleRowProps,
  SalesReportBodyProps,
  SalesReportListProps,
} from "@/lib/interfaces/business";
import { toServerPagination } from "@/lib/pagination";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  formatPriceInCurrency,
  SALES_REPORT_BUY_PARAM,
  SALES_REPORT_FROM_PARAM,
  SALES_REPORT_TO_PARAM,
} from "@magic-vault/shared";
import {
  IconChartLine,
  IconCoin,
  IconCoins,
  IconDownload,
  IconLoader2,
  IconLock,
  IconPercentage,
  IconReceipt,
  IconShoppingCart,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

function SaleMoney({ value, currency }: SaleMoneyProps) {
  return value == null ? <MissingPrice /> : <>{formatPriceInCurrency(value, currency)}</>;
}

function SaleCardLabel({ sale }: SaleRowProps) {
  const { t } = useTranslation("business");
  const printing = [sale.setCode?.toUpperCase(), sale.collectorNumber].filter(Boolean).join(" ");
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-medium">{sale.cardName}</span>
      <span className="truncate text-xs text-foreground/70">
        {[printing, sale.condition, sale.isFoil ? t("table.foil") : null]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
  );
}

function SaleBuyLink({ sale }: SaleRowProps) {
  const { t } = useTranslation("business");
  if (!sale.buyGuid) {
    return (
      <>
        <span aria-hidden="true">-</span>
        <span className="sr-only">{t("sales.noBuy")}</span>
      </>
    );
  }
  return (
    <Link
      to={intakeLotPath(sale.buyGuid)}
      className="truncate hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {sale.buyName}
    </Link>
  );
}

function SalesReportTable({ report, showsCosts }: SalesReportListProps) {
  const { t } = useTranslation("business");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("sales.columns.soldAt")}</TableHead>
          <TableHead>{t("sales.columns.card")}</TableHead>
          <TableHead className="text-right">{t("sales.columns.salePrice")}</TableHead>
          {showsCosts && (
            <>
              <TableHead className="text-right">{t("sales.columns.cost")}</TableHead>
              <TableHead className="text-right">{t("sales.columns.profit")}</TableHead>
            </>
          )}
          <TableHead>{t("sales.columns.channel")}</TableHead>
          <TableHead>{t("sales.columns.buy")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.items.map((sale) => (
          <TableRow key={sale.guid}>
            <TableCell className="whitespace-nowrap text-foreground/70">
              {formatDateTime(sale.soldAt)}
            </TableCell>
            <TableCell className="max-w-72">
              <SaleCardLabel sale={sale} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <SaleMoney value={sale.salePrice} currency={sale.currency} />
            </TableCell>
            {showsCosts && (
              <>
                <TableCell className="text-right tabular-nums">
                  <SaleMoney value={sale.cost} currency={sale.currency} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  <SaleMoney value={sale.profit} currency={sale.currency} />
                </TableCell>
              </>
            )}
            <TableCell>{t(`sales.channels.${sale.channel}`)}</TableCell>
            <TableCell className="max-w-48">
              <SaleBuyLink sale={sale} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SalesReportMobileList({ report, showsCosts }: SalesReportListProps) {
  const { t } = useTranslation("business");
  return (
    <ul className={MOBILE_LIST_CLASS}>
      {report.items.map((sale) => (
        <li key={sale.guid} className="flex items-start gap-3 py-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SaleCardLabel sale={sale} />
            <span className="truncate text-xs text-foreground/70">
              {formatDateTime(sale.soldAt)} · {t(`sales.channels.${sale.channel}`)}
            </span>
            {sale.buyGuid && (
              <span className="truncate text-xs">
                {t("sales.boughtIn")} <SaleBuyLink sale={sale} />
              </span>
            )}
          </span>
          <span className="flex shrink-0 flex-col items-end text-sm tabular-nums">
            <span className="font-medium">
              <SaleMoney value={sale.salePrice} currency={sale.currency} />
            </span>
            {showsCosts && sale.profit != null && (
              <span className="text-xs text-foreground/70">
                {t("sales.profitShort", {
                  value: formatPriceInCurrency(sale.profit, sale.currency),
                })}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SalesReportBody({ filters }: SalesReportBodyProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const [page, setPage] = useState(1);
  const showsCosts = access?.canViewCosts ?? false;
  const report = useQuery(salesReportQueryOptions(orgId, filters, page, !!access));

  if (report.isPending) {
    return (
      <>
        <StatGroupSkeleton
          tiles={showsCosts ? 5 : 2}
          gridClassName={cn("grid-cols-2", showsCosts ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2")}
          hasIcons
        />
        {isMobile ? (
          <MobileListSkeleton
            rows={SALES_TABLE_SKELETON_ROWS}
            leading="none"
            hasTrailing
            rowClassName="py-3"
          />
        ) : (
          <SkeletonStatus>
            <TableSkeleton columns={SALES_SKELETON_COLUMNS} rows={SALES_TABLE_SKELETON_ROWS} />
          </SkeletonStatus>
        )}
      </>
    );
  }
  if (report.isError || !report.data) {
    return (
      <LoadErrorCallout message={t("errors.loadFailed")} onRetry={() => void report.refetch()} />
    );
  }
  const data = report.data;
  const { totals } = data;
  const pagination = toServerPagination(data, setPage);

  return (
    <>
      <StatGroup
        heading={t("sales.totals")}
        dataTour="sales-totals"
        gridClassName={cn("grid-cols-2", showsCosts ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2")}
        tiles={[
          {
            key: "count",
            icon: IconShoppingCart,
            label: t("overview.tiles.soldCards"),
            value: totals.saleCount,
          },
          {
            key: "revenue",
            icon: IconCoins,
            label: t("overview.tiles.revenue"),
            value: <CompactPrice value={totals.revenue} />,
          },
          ...(showsCosts
            ? [
                {
                  key: "cost",
                  icon: IconCoin,
                  label: t("sales.costOfSold"),
                  value: totals.cost == null ? null : <CompactPrice value={totals.cost} />,
                },
                {
                  key: "profit",
                  icon: IconChartLine,
                  label: t("sales.profit"),
                  value: totals.profit == null ? null : <CompactPrice value={totals.profit} />,
                  detail: t("sales.costedSales", { count: totals.costedCount }),
                },
                {
                  key: "margin",
                  icon: IconPercentage,
                  label: t("sales.margin"),
                  value:
                    totals.marginPercent == null
                      ? null
                      : t("intake.performance.percent", { value: totals.marginPercent }),
                },
              ]
            : []),
        ]}
      />
      {data.items.length === 0 ? (
        <EmptyState
          icon={IconReceipt}
          title={t("sales.emptyTitle")}
          description={t("sales.emptyDescription")}
        />
      ) : (
        <div data-tour="sales-table" className="flex flex-col gap-2">
          {isMobile ? (
            <SalesReportMobileList report={data} showsCosts={showsCosts} />
          ) : (
            <SalesReportTable report={data} showsCosts={showsCosts} />
          )}
          <ListPagination alignsEnd pagination={pagination} compact={isMobile} />
        </div>
      )}
    </>
  );
}

export function SalesReportPage() {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { access } = useBusinessAccess();
  const [params, setParams] = useSearchParams();
  const filters = salesReportFiltersFrom(params);
  const buyLot = useQuery(intakeLotQueryOptions(filters.buyGuid ?? undefined));
  const [isExporting, setIsExporting] = useState(false);
  const canSeeSales = !!access && (access.canViewCosts || access.canFulfilOrders);

  const setParam = (key: string, value: string | null) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      downloadBlob(await downloadSalesReportCsv(filters), "sales.csv");
    } catch (error) {
      console.error("Couldn't export sales", error);
      toast.error(t("sales.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const title = t("sales.title");
  const description = t("sales.description");
  const exportButton = (
    <Button
      variant="outline"
      data-tour="sales-export"
      disabled={!canSeeSales || access?.isLocked || isExporting}
      onClick={() => void exportCsv()}
    >
      {isExporting ? <IconLoader2 className="animate-spin" /> : <IconDownload />}
      {t("sales.export")}
    </Button>
  );

  const filterBar = (
    <div data-tour="sales-filters" className="flex flex-wrap items-end gap-3 md:gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="sales-from" className="text-control">
          {t("sales.from")}
        </Label>
        <Input
          id="sales-from"
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(event) => setParam(SALES_REPORT_FROM_PARAM, event.target.value)}
          className="w-auto"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sales-to" className="text-control">
          {t("sales.to")}
        </Label>
        <Input
          id="sales-to"
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(event) => setParam(SALES_REPORT_TO_PARAM, event.target.value)}
          className="w-auto"
        />
      </div>
      {filters.buyGuid && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-foreground/6 py-0.5 pr-0.5 pl-2 text-control">
          <span className="max-w-56 truncate">
            {t("sales.buyFilter", {
              name: buyLot.data?.customerName ?? t("sales.buyFilterUnknown"),
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("sales.removeBuyFilter")}
            title={t("sales.removeBuyFilter")}
            onClick={() => setParam(SALES_REPORT_BUY_PARAM, null)}
          >
            <IconX />
          </Button>
        </span>
      )}
    </div>
  );

  const content = access?.isLocked ? (
    <BusinessUpgradeCallout />
  ) : access && !canSeeSales ? (
    <Callout icon={IconLock}>{t("sales.noAccess")}</Callout>
  ) : (
    <>
      {filterBar}
      <SalesReportBody key={JSON.stringify(filters)} filters={filters} />
    </>
  );

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
      {isMobile ? (
        <MobilePageHeader
          title={title}
          subtitle={description}
          actions={
            <BusinessTour tour={BUSINESS_SALES_TOUR} className={MOBILE_CIRCLE_BUTTON_CLASS} />
          }
        >
          {exportButton}
        </MobilePageHeader>
      ) : (
        <PageHeader
          title={title}
          description={description}
          actions={
            <>
              <BusinessTour tour={BUSINESS_SALES_TOUR} />
              {exportButton}
            </>
          }
        />
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:gap-2 md:px-3 md:py-2">
        <BusinessOverviewBackButton />
        {content}
      </div>
    </div>
  );
}
