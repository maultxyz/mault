import { CompactPrice } from "@/components/compact-value";
import { IconBadge } from "@/components/icon-badge";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { SettingsSection } from "@/components/settings-section";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  businessOverviewQueryOptions,
  inventoryMarginQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { AccuracyReportView } from "@/features/business/components/accuracy-report";
import {
  BusinessInventoryCosts,
  BusinessInventoryValueChart,
} from "@/features/business/components/business-inventory-costs";
import { BusinessSalesChart } from "@/features/business/components/business-overview-charts";
import { BusinessOverviewSkeleton } from "@/features/business/components/business-overview-skeleton";
import { BusinessPageHeader } from "@/features/business/components/business-page-header";
import { BusinessTour } from "@/features/business/components/business-tour";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { StaffReportView } from "@/features/business/components/staff-report";
import { BUSINESS_OVERVIEW_TOUR } from "@/features/business/lib/business-tours";
import { salesMarginPercent } from "@/features/business/lib/sales-report";
import { statsReportQueryOptions } from "@/features/stats/api/stats";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  BUSINESS_ATTENTION_ICONS,
  BUSINESS_OVERVIEW_CHECK_PARAM,
  BUSINESS_OVERVIEW_COLLECTION_PARAM,
  BUSINESS_OVERVIEW_MAIN_VIEW,
  BUSINESS_OVERVIEW_RANGE_PARAM,
  BUSINESS_OVERVIEW_VIEW_PARAM,
  BUSINESS_OVERVIEW_VIEWS,
  BUSINESS_SECTION_PATHS,
  INTAKE_PATH,
  intakeLotPath,
  PICKS_PATH,
  picksPath,
  SALES_PATH,
} from "@/lib/constants/business";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import { STATS_PATH } from "@/lib/constants/stats";
import type {
  BusinessOverviewBodyProps,
  BusinessOverviewListPanelProps,
  BusinessOverviewRowProps,
  BusinessOverviewView,
} from "@/lib/interfaces/business";
import type { StatGroupTile } from "@/lib/interfaces/stat-group";
import { cn } from "@/lib/utils";
import {
  BUSINESS_OVERVIEW_SALES_DAYS,
  businessOverviewAttentionItems,
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
} from "@magic-vault/shared";
import { IconChevronRight, IconCircleCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

function BusinessOverviewRow({
  to,
  title,
  detail,
  description,
  icon: RowIcon,
}: BusinessOverviewRowProps) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:gap-2"
      >
        {RowIcon && (
          <IconBadge aria-hidden size="compact">
            <RowIcon className="size-4" />
          </IconBadge>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{title}</span>
          {description && (
            <span className="text-xs text-foreground/70">{description}</span>
          )}
        </span>
        {detail && <span className="shrink-0 text-xs text-foreground/70">{detail}</span>}
        <IconChevronRight aria-hidden className="size-3.5 shrink-0 text-foreground/70" />
      </Link>
    </li>
  );
}

function BusinessOverviewListPanel({
  heading,
  description,
  to,
  linkLabel,
  emptyText,
  children,
}: BusinessOverviewListPanelProps) {
  return (
    <SettingsSection
      heading={heading}
      description={description}
      action={
        <Button variant="outline" render={<Link to={to} />} nativeButton={false}>
          {linkLabel}
          <IconChevronRight />
        </Button>
      }
    >
      {children ? (
        <ul className="-mx-2 flex flex-col">{children}</ul>
      ) : (
        <p className="text-sm text-foreground/70">{emptyText}</p>
      )}
    </SettingsSection>
  );
}

function BusinessOverviewBody({ overview }: BusinessOverviewBodyProps) {
  const { t } = useTranslation("business");
  const { orgId, access } = useBusinessAccess();
  const canViewCosts = access?.canViewCosts ?? false;
  const costReport = useQuery(
    statsReportQueryOptions(canViewCosts ? orgId : undefined, STATS_DEFAULT_RANGE, null),
  );
  const inventoryMargin = useQuery(inventoryMarginQueryOptions(orgId, canViewCosts));
  const { intake, picks, sales } = overview;
  const attention = businessOverviewAttentionItems(overview);
  const inventoryReport =
    costReport.data?.costsVisible && costReport.data.totals.cardCount > 0
      ? costReport.data
      : null;
  const isInventoryLoading = canViewCosts && costReport.isPending;
  const margin = inventoryMargin.data?.costedCount ? inventoryMargin.data : null;
  const salesPeriod = t("overview.tiles.lastDays", { days: BUSINESS_OVERVIEW_SALES_DAYS });

  const performanceTiles: StatGroupTile[] = [
    sales.total != null
      ? {
          key: "revenue",
          to: SALES_PATH,
          label: t("overview.tiles.revenue"),
          value: <CompactPrice value={sales.total} />,
          detail: t("overview.tiles.salesPeriod", {
            cards: t("overview.cards", { count: sales.cardCount }),
            days: BUSINESS_OVERVIEW_SALES_DAYS,
          }),
        }
      : {
          key: "soldCards",
          to: SALES_PATH,
          label: t("overview.tiles.soldCards"),
          value: sales.cardCount,
          detail: salesPeriod,
        },
    ...(sales.profit != null
      ? [
          {
            key: "profit",
            to: SALES_PATH,
            label: t("overview.tiles.profit"),
            value: <CompactPrice value={sales.profit} />,
            detail:
              sales.costedCount > 0 && sales.costOfSold != null
                ? t("overview.tiles.profitMarginPeriod", {
                    percent: salesMarginPercent(sales.profit, sales.costOfSold),
                    days: BUSINESS_OVERVIEW_SALES_DAYS,
                  })
                : t("overview.tiles.profitNoCosts"),
          },
        ]
      : []),
    ...(isInventoryLoading || inventoryReport
      ? [
          {
            key: "inventoryValue",
            to: STATS_PATH,
            label: t("overview.inventory.value"),
            value: inventoryReport ? (
              <CompactPrice value={inventoryReport.totals.totalValue} />
            ) : (
              <Skeleton className="my-1 h-5 w-20" />
            ),
            detail: inventoryReport
              ? t("overview.cards", { count: inventoryReport.totals.cardCount })
              : null,
          },
          {
            key: "unrealizedProfit",
            label: t("overview.inventory.unrealizedProfit"),
            value: margin ? (
              <CompactPrice value={margin.unrealizedProfit} />
            ) : isInventoryLoading || inventoryMargin.isPending ? (
              <Skeleton className="my-1 h-5 w-20" />
            ) : (
              "-"
            ),
            detail:
              margin?.marginPercent != null
                ? t("overview.inventory.marginPercent", { percent: margin.marginPercent })
                : margin || isInventoryLoading
                  ? null
                  : t("overview.tiles.profitNoCosts"),
          },
        ]
      : []),
  ];

  return (
    <>
      <section
        data-tour="business-todo"
        aria-labelledby="business-todo-heading"
        className="flex flex-col gap-2"
      >
        <h2
          id="business-todo-heading"
          className="font-heading text-base font-semibold text-foreground md:text-sm"
        >
          {t("overview.todo.heading")}
        </h2>
        <div className="rounded-card bg-card p-3 md:p-2">
          {attention.length > 0 ? (
            <ul className="flex flex-col">
              {attention.map((item) => (
                <BusinessOverviewRow
                  key={item.key}
                  to={BUSINESS_SECTION_PATHS[item.section]}
                  icon={BUSINESS_ATTENTION_ICONS[item.key]}
                  title={t(`overview.attention.${item.key}.title`, { count: item.count })}
                  description={t(`overview.attention.${item.key}.detail`, { count: item.count })}
                />
              ))}
            </ul>
          ) : (
            <div role="status" className="flex items-center gap-3 px-2 py-1.5 md:gap-2">
              <IconBadge aria-hidden size="compact">
                <IconCircleCheck className="size-4" />
              </IconBadge>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{t("overview.attention.allClear.title")}</span>
                <span className="text-xs text-foreground/70">
                  {t("overview.attention.allClear.detail")}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-1.5 [&>*]:min-w-0">
          <BusinessOverviewListPanel
            heading={t("overview.tiles.openIntake")}
            description={t("overview.intake.summary", {
              lots: intake.openLotCount,
              cards: t("overview.cards", { count: intake.openCardCount }),
            })}
            to={INTAKE_PATH}
            linkLabel={t("overview.intake.link")}
            emptyText={t("overview.intake.empty")}
          >
            {intake.latestOpenLots.length > 0 &&
              intake.latestOpenLots.map((lot) => (
                <BusinessOverviewRow
                  key={lot.guid}
                  to={intakeLotPath(lot.guid)}
                  title={lot.customerName}
                  detail={t("overview.cards", { count: lot.cardCount })}
                />
              ))}
          </BusinessOverviewListPanel>
          <BusinessOverviewListPanel
            heading={t("overview.tiles.openPicks")}
            description={t("overview.picks.summary", {
              picks: picks.openPickCount,
              cards: t("overview.cards", { count: picks.cardsToPick }),
            })}
            to={PICKS_PATH}
            linkLabel={t("overview.picks.link")}
            emptyText={t("overview.picks.empty")}
          >
            {picks.latestOpenPicks.length > 0 &&
              picks.latestOpenPicks.map((pick) => (
                <BusinessOverviewRow
                  key={pick.guid}
                  to={picksPath(pick.guid)}
                  title={pick.name}
                  detail={t("overview.picks.progress", {
                    picked: pick.picked,
                    total: pick.quantity,
                  })}
                />
              ))}
          </BusinessOverviewListPanel>
        </div>
      </section>

      <StatGroup
        heading={t("overview.performance.heading")}
        dataTour="business-performance"
        prominent
        gridClassName={cn(
          "grid-cols-2",
          performanceTiles.length === 3 && "sm:grid-cols-3",
          performanceTiles.length === 4 && "lg:grid-cols-4",
        )}
        tiles={performanceTiles}
      />

      <div
        data-tour="business-charts"
        className={cn("grid gap-4 md:gap-1.5 [&>*]:min-w-0", inventoryReport && "lg:grid-cols-2")}
      >
        <BusinessSalesChart sales={sales} />
        {inventoryReport && <BusinessInventoryValueChart report={inventoryReport} />}
      </div>

      {inventoryReport && (
        <BusinessInventoryCosts report={inventoryReport} margin={inventoryMargin.data ?? null} />
      )}
    </>
  );
}

export function BusinessOverviewDashboard() {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const [params, setParams] = useSearchParams();
  const overview = useQuery(businessOverviewQueryOptions(orgId));
  const view: BusinessOverviewView = isMobile
    ? BUSINESS_OVERVIEW_MAIN_VIEW
    : (BUSINESS_OVERVIEW_VIEWS.find(
        (value) => value === params.get(BUSINESS_OVERVIEW_VIEW_PARAM),
      ) ?? BUSINESS_OVERVIEW_MAIN_VIEW);
  const range =
    STATS_RANGES.find((value) => value === params.get(BUSINESS_OVERVIEW_RANGE_PARAM)) ??
    STATS_DEFAULT_RANGE;
  const title = t("overview.title");
  const description = t("overview.description");

  const setParam = (key: string, value: string | null) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const viewSwitch = (
    <div data-tour="business-overview-views" className="self-start">
      <ResponsiveSegmented<BusinessOverviewView>
        label={title}
        items={BUSINESS_OVERVIEW_VIEWS.map((value) => ({
          key: value,
          label: t(`overview.views.${value}`),
        }))}
        value={view}
        onChange={(value) =>
          setParams(
            (previous) => {
              const next = new URLSearchParams(previous);
              if (value === BUSINESS_OVERVIEW_MAIN_VIEW) next.delete(BUSINESS_OVERVIEW_VIEW_PARAM);
              else next.set(BUSINESS_OVERVIEW_VIEW_PARAM, value);
              next.delete(BUSINESS_OVERVIEW_CHECK_PARAM);
              return next;
            },
            { replace: true },
          )
        }
      />
    </div>
  );

  const body =
    view === "staff" ? (
      <StaffReportView
        range={range}
        onRangeChange={(next) =>
          setParam(BUSINESS_OVERVIEW_RANGE_PARAM, next === STATS_DEFAULT_RANGE ? null : next)
        }
      />
    ) : view === "accuracy" ? (
      <AccuracyReportView
        collectionGuid={params.get(BUSINESS_OVERVIEW_COLLECTION_PARAM)}
        checkGuid={params.get(BUSINESS_OVERVIEW_CHECK_PARAM)}
        onCollectionChange={(guid) => setParam(BUSINESS_OVERVIEW_COLLECTION_PARAM, guid)}
        onCheckChange={(guid) => setParam(BUSINESS_OVERVIEW_CHECK_PARAM, guid)}
      />
    ) : overview.isPending ? (
      <BusinessOverviewSkeleton />
    ) : overview.isError || !overview.data ? (
      <LoadErrorCallout
        message={t("errors.loadFailed")}
        onRetry={() => void overview.refetch()}
      />
    ) : (
      <BusinessOverviewBody overview={overview.data} />
    );

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
      {isMobile ? (
        <MobilePageHeader
          title={title}
          subtitle={description}
          actions={
            <BusinessTour tour={BUSINESS_OVERVIEW_TOUR} className={MOBILE_CIRCLE_BUTTON_CLASS} />
          }
        />
      ) : (
        <BusinessPageHeader
          view="overview"
          description={description}
          actions={<BusinessTour tour={BUSINESS_OVERVIEW_TOUR} />}
        />
      )}
      <div className="flex w-full flex-col gap-6 p-4 md:gap-2 md:px-3 md:py-2">
        {access?.isLocked && <BusinessUpgradeCallout />}
        {!isMobile && viewSwitch}
        {body}
      </div>
    </div>
  );
}
