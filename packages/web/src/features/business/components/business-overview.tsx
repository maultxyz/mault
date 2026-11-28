import { CompactPrice } from "@/components/compact-value";
import { IconBadge } from "@/components/icon-badge";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { BusinessPageHeader } from "@/features/business/components/business-page-header";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { BusinessOverviewSkeleton } from "@/features/business/components/business-overview-skeleton";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  businessOverviewQueryOptions,
  inventoryMarginQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { AccuracyReportView } from "@/features/business/components/accuracy-report";
import { BusinessInventoryCosts } from "@/features/business/components/business-inventory-costs";
import {
  BusinessReservationsChart,
  BusinessSalesChart,
} from "@/features/business/components/business-overview-charts";
import { BusinessTour } from "@/features/business/components/business-tour";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { BUSINESS_OVERVIEW_TOUR } from "@/features/business/lib/business-tours";
import { salesMarginPercent } from "@/features/business/lib/sales-report";
import { StaffReportView } from "@/features/business/components/staff-report";
import { statsReportQueryOptions } from "@/features/stats/api/stats";
import { StatsHighlights } from "@/features/stats/components/stats-highlights";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
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
  PRICE_LABELS_PATH,
  RESERVATIONS_PATH,
  SALES_PATH,
} from "@/lib/constants/business";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import type {
  BusinessOverviewBodyProps,
  BusinessOverviewRowProps,
  BusinessOverviewSectionProps,
  BusinessOverviewView,
} from "@/lib/interfaces/business";
import type { StatsInsight } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import {
  BUSINESS_OVERVIEW_SALES_DAYS,
  businessOverviewAttentionItems,
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
} from "@magic-vault/shared";
import {
  IconBookmark,
  IconCash,
  IconChartLine,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconCoins,
  IconListCheck,
  IconPackageExport,
  IconReceipt,
  IconShoppingCart,
  IconTag,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

function BusinessOverviewRow({ to, title, detail }: BusinessOverviewRowProps) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        <span className="shrink-0 text-xs text-foreground/70">{detail}</span>
        <IconChevronRight aria-hidden className="size-3.5 shrink-0 text-foreground/70" />
      </Link>
    </li>
  );
}

function BusinessOverviewSection({
  icon: SectionIcon,
  title,
  description,
  to,
  linkLabel,
  children,
}: BusinessOverviewSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-4 md:gap-2 md:p-2.5">
      <div className="flex items-start gap-3">
        <IconBadge aria-hidden>
          <SectionIcon className="size-4" />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-foreground/70">{description}</p>
        </div>
      </div>
      {children}
      <Button
        variant="outline"
        className="mt-auto self-start"
        render={<Link to={to} />}
        nativeButton={false}
      >
        {linkLabel}
        <IconChevronRight />
      </Button>
    </section>
  );
}

function BusinessOverviewBody({ overview }: BusinessOverviewBodyProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const { format } = usePriceSource();
  const costReport = useQuery(
    statsReportQueryOptions(access?.canViewCosts ? orgId : undefined, STATS_DEFAULT_RANGE, null),
  );
  const inventoryMargin = useQuery(
    inventoryMarginQueryOptions(orgId, access?.canViewCosts ?? false),
  );
  const { intake, picks, reservations, sales } = overview;
  const attention = businessOverviewAttentionItems(overview);
  const insights: StatsInsight[] =
    attention.length > 0
      ? attention.map((item) => ({
          key: item.key,
          icon: BUSINESS_ATTENTION_ICONS[item.key],
          title: t(`overview.attention.${item.key}.title`, { count: item.count }),
          detail: t(`overview.attention.${item.key}.detail`, { count: item.count }),
          to: BUSINESS_SECTION_PATHS[item.section],
        }))
      : [
          {
            key: "allClear",
            icon: IconCircleCheck,
            title: t("overview.attention.allClear.title"),
            detail: t("overview.attention.allClear.detail"),
          },
        ];

  return (
    <>
      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <StatGroup
          heading={t("overview.now.heading")}
          dataTour="business-now"
          live
          gridClassName="grid-cols-2 sm:grid-cols-3"
          tiles={[
            {
              key: "openIntake",
              to: INTAKE_PATH,
              icon: IconCash,
              label: t("overview.tiles.openIntake"),
              value: intake.openLotCount,
              detail: t("overview.cards", { count: intake.openCardCount }),
            },
            {
              key: "openPicks",
              to: PICKS_PATH,
              icon: IconTruckDelivery,
              label: t("overview.tiles.openPicks"),
              value: picks.openPickCount,
              detail: t("overview.tiles.readyToComplete", { count: picks.readyToCompleteCount }),
            },
            {
              key: "cardsToPick",
              to: PICKS_PATH,
              icon: IconListCheck,
              label: t("overview.tiles.cardsToPick"),
              value: picks.cardsToPick,
            },
            ...(reservations
              ? [
                  {
                    key: "readyForPickup",
                    to: RESERVATIONS_PATH,
                    icon: IconBookmark,
                    label: t("reservations.stages.readyForPickup"),
                    value: reservations.readyForPickup,
                    detail: t("overview.tiles.requests", { count: reservations.readyForPickup }),
                  },
                  {
                    key: "toPull",
                    to: RESERVATIONS_PATH,
                    icon: IconPackageExport,
                    label: t("reservations.stages.toPull"),
                    value: reservations.toPull,
                    detail: t("overview.tiles.beingPicked", { count: reservations.beingPicked }),
                  },
                  {
                    key: "waiting",
                    to: RESERVATIONS_PATH,
                    icon: IconClock,
                    label: t("reservations.stages.waiting"),
                    value: reservations.waiting,
                    detail: t("overview.tiles.requests", { count: reservations.waiting }),
                  },
                ]
              : []),
          ]}
        />
        <StatGroup
          heading={t("overview.sales.heading", { days: BUSINESS_OVERVIEW_SALES_DAYS })}
          gridClassName={sales.profit != null ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}
          tiles={[
            {
              key: "soldCards",
              to: SALES_PATH,
              icon: IconShoppingCart,
              label: t("overview.tiles.soldCards"),
              value: sales.cardCount,
              detail: t("overview.tiles.perDay", {
                count: Math.round((sales.cardCount / BUSINESS_OVERVIEW_SALES_DAYS) * 10) / 10,
              }),
            },
            ...(sales.total != null
              ? [
                  {
                    key: "revenue",
                    to: SALES_PATH,
                    icon: IconCoins,
                    label: t("overview.tiles.revenue"),
                    value: <CompactPrice value={sales.total} />,
                    detail:
                      sales.cardCount > 0
                        ? t("overview.tiles.averageSale", {
                            value: format(sales.total / sales.cardCount),
                          })
                        : null,
                  },
                ]
              : []),
            ...(sales.profit != null
              ? [
                  {
                    key: "profit",
                    to: SALES_PATH,
                    icon: IconChartLine,
                    label: t("overview.tiles.profit"),
                    value: <CompactPrice value={sales.profit} />,
                    detail:
                      sales.costedCount > 0 && sales.costOfSold != null
                        ? t("overview.tiles.profitMargin", {
                            percent: salesMarginPercent(sales.profit, sales.costOfSold),
                          })
                        : t("overview.tiles.profitNoCosts"),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <StatsHighlights
        heading={t("overview.attention.heading")}
        insights={insights}
        dataTour="business-attention"
      />

      <div data-tour="business-charts" className="grid gap-4 md:gap-1.5 lg:grid-cols-2 [&>*]:min-w-0">
        <BusinessSalesChart sales={sales} />
        {reservations && <BusinessReservationsChart reservations={reservations} />}
      </div>

      <div data-tour="business-sections" className="grid gap-4 md:grid-cols-2 md:gap-1.5">
        <BusinessOverviewSection
          icon={IconCash}
          title={t("views.intake")}
          description={t("overview.intake.description")}
          to={INTAKE_PATH}
          linkLabel={t("overview.intake.link")}
        >
          {intake.latestOpenLots.length > 0 ? (
            <ul className="-mx-2 flex flex-col">
              {intake.latestOpenLots.map((lot) => (
                <BusinessOverviewRow
                  key={lot.guid}
                  to={intakeLotPath(lot.guid)}
                  title={lot.customerName}
                  detail={t("overview.cards", { count: lot.cardCount })}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-foreground/70">{t("overview.intake.empty")}</p>
          )}
        </BusinessOverviewSection>
        <BusinessOverviewSection
          icon={IconTruckDelivery}
          title={t("views.picks")}
          description={t("overview.picks.description")}
          to={PICKS_PATH}
          linkLabel={t("overview.picks.link")}
        >
          {picks.latestOpenPicks.length > 0 ? (
            <ul className="-mx-2 flex flex-col">
              {picks.latestOpenPicks.map((pick) => (
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
            </ul>
          ) : (
            <p className="text-xs text-foreground/70">{t("overview.picks.empty")}</p>
          )}
        </BusinessOverviewSection>
        <BusinessOverviewSection
          icon={IconReceipt}
          title={t("views.sales")}
          description={t("overview.salesSection.description")}
          to={SALES_PATH}
          linkLabel={t("overview.salesSection.link")}
        />
        {reservations && (
          <BusinessOverviewSection
            icon={IconBookmark}
            title={t("views.reservations")}
            description={t("overview.reservations.description")}
            to={RESERVATIONS_PATH}
            linkLabel={t("overview.reservations.link")}
          />
        )}
        {!isMobile && (
          <BusinessOverviewSection
            icon={IconTag}
            title={t("views.labels")}
            description={t("overview.labels.description")}
            to={PRICE_LABELS_PATH}
            linkLabel={t("overview.labels.link")}
          />
        )}
      </div>

      {costReport.data?.costsVisible && costReport.data.totals.cardCount > 0 && (
        <BusinessInventoryCosts report={costReport.data} margin={inventoryMargin.data ?? null} />
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
