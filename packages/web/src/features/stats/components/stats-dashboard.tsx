import { CardImage } from "@/components/card-image";
import { DisplayHeadline } from "@/components/display-headline";
import { StatGroup } from "@/components/stat-group";
import { SettingsSection } from "@/components/settings-section";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toScanStats } from "@/features/scanner/lib/compute-stats";
import { AreaChart } from "@/features/stats/components/area-chart";
import { BarList } from "@/features/stats/components/bar-list";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { DonutChart } from "@/features/stats/components/donut-chart";
import { StatsHighlights } from "@/features/stats/components/stats-highlights";
import { ValueHero } from "@/features/stats/components/value-hero";
import { buildStatsInsights } from "@/features/stats/lib/stats-insights";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  STATS_ACTIVITY_METRICS,
  STATS_BAR_LIST_LIMIT,
  STATS_COLLECTION_COST_COLUMNS,
  STATS_COLLECTION_METRICS,
  STATS_COLLECTION_TABLE_COLUMNS,
  STATS_SPLIT_MAX_SEGMENTS,
} from "@/lib/constants/stats";
import type {
  StatsActivityMetric,
  StatsActivitySectionProps,
  StatsCollectionColumn,
  StatsCollectionMetric,
  StatsCollectionSort,
  StatsCollectionsSectionProps,
  StatsCollectionsTableProps,
  StatsDashboardProps,
  StatsSplitEntry,
  StatsTopCardsProps,
  StatsValueSectionProps,
} from "@/lib/interfaces/stats";
import type { CollectionCostTarget } from "@/lib/interfaces/business";
import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { CollectionCostDialog } from "@/features/business/components/collection-cost-dialog";
import { cn } from "@/lib/utils";
import {
  foldChartSegments,
  statsHeroSparklineValues,
  statsSharePercent,
  type StatsCollectionRow,
} from "@magic-vault/shared";
import {
  IconArrowDown,
  IconArrowUp,
  IconChartLine,
  IconCoin,
  IconCoins,
  IconHelpCircle,
  IconScan,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatsActivitySection({ report }: StatsActivitySectionProps) {
  const { t } = useTranslation("stats");
  const { format } = usePriceSource();
  const [metric, setMetric] = useState<StatsActivityMetric>("count");
  const isWeekly = report.bucket === "week";
  const compactNumber = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <SettingsSection
      heading={t("activity.title")}
      description={t(`activity.description.${report.bucket}`)}
      action={
        <ResponsiveSegmented
          label={t("activity.title")}
          items={STATS_ACTIVITY_METRICS.map((option) => ({
            key: option,
            label: t(`activity.metrics.${option}`),
          }))}
          value={metric}
          onChange={setMetric}
        />
      }
    >
      <AreaChart
        ariaLabel={t(`activity.metrics.${metric}`)}
        data={report.activity.map((bucket) => ({
          key: bucket.start,
          label: isWeekly
            ? t("activity.weekOf", { date: formatDay(bucket.start) })
            : formatDay(bucket.start),
          value: metric === "count" ? bucket.count : bucket.value,
        }))}
        formatValue={(value) =>
          metric === "count" ? value.toLocaleString() : format(value)
        }
        formatAxisValue={(value) =>
          metric === "count" ? compactNumber.format(value) : format(value)
        }
        endLabel={isWeekly ? t("activity.thisWeek") : t("activity.today")}
      />
    </SettingsSection>
  );
}

function collectionMargin(row: StatsCollectionRow): number | null {
  return row.costedCount ? (row.costedValue ?? 0) - (row.costBasis ?? 0) : null;
}

function sortValue(row: StatsCollectionRow, column: StatsCollectionColumn) {
  if (column === "name") return row.name.toLowerCase();
  if (column === "lastScanAt") return row.lastScanAt ?? "";
  if (column === "costBasis")
    return row.costedCount ? (row.costBasis ?? 0) : -1;
  if (column === "margin")
    return collectionMargin(row) ?? Number.NEGATIVE_INFINITY;
  return row[column];
}

function StatsValueSection({ report }: StatsValueSectionProps) {
  const { t } = useTranslation("stats");
  const { t: tBusiness } = useTranslation("business");
  const { format } = usePriceSource();
  const history = report.valueHistory ?? [];

  return (
    <SettingsSection
      heading={tBusiness("reports.inventory.history")}
      description={t("value.description")}
    >
      {history.length < 2 ? (
        <EmptyState
          size="compact"
          icon={IconChartLine}
          title={tBusiness("reports.inventory.historyEmpty")}
          description={tBusiness("reports.inventory.historyEmptyDescription")}
        />
      ) : (
        <AreaChart
          ariaLabel={tBusiness("reports.inventory.history")}
          formatValue={format}
          formatAxisValue={format}
          data={history.map((point) => ({
            key: point.day,
            label: formatDay(point.day),
            value: point.marketValue,
          }))}
        />
      )}
    </SettingsSection>
  );
}

function StatsCollectionsTable({
  collections,
  costsVisible,
  onSelectCollection,
  onSetCost,
}: StatsCollectionsTableProps) {
  const { t } = useTranslation("stats");
  const { t: tBusiness } = useTranslation("business");
  const { access } = useBusinessAccess();
  const columns: StatsCollectionColumn[] = costsVisible
    ? [...STATS_COLLECTION_TABLE_COLUMNS, ...STATS_COLLECTION_COST_COLUMNS]
    : [...STATS_COLLECTION_TABLE_COLUMNS];
  const { format } = usePriceSource();
  const [sort, setSort] = useState<StatsCollectionSort>({
    column: "totalValue",
    desc: true,
  });

  const rows = [...collections].sort((a, b) => {
    const left = sortValue(a, sort.column);
    const right = sortValue(b, sort.column);
    const order = left < right ? -1 : left > right ? 1 : 0;
    return sort.desc ? -order : order;
  });

  const cell = (row: StatsCollectionRow, column: StatsCollectionColumn) => {
    switch (column) {
      case "name":
        return (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">
              {row.name}
            </span>
            {row.gameName && (
              <span className="truncate text-2xs text-foreground/70">
                {row.gameName}
              </span>
            )}
          </span>
        );
      case "totalValue":
      case "avgValue":
        return format(row[column]);
      case "lastScanAt":
        return formatShortDate(row.lastScanAt) ?? t("compare.never");
      case "costBasis":
        return row.costedCount ? format(row.costBasis ?? 0) : "-";
      case "margin": {
        const margin = collectionMargin(row);
        return margin === null ? "-" : format(margin);
      }
      default:
        return row[column].toLocaleString();
    }
  };

  return (
    <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const active = sort.column === column;
              return (
                <TableHead
                  key={column}
                  className={cn(column !== "name" && "text-right")}
                  aria-sort={
                    active ? (sort.desc ? "descending" : "ascending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort({
                        column,
                        desc: active ? !sort.desc : column !== "name",
                      })
                    }
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      active ? "text-foreground" : "text-foreground/70",
                    )}
                  >
                    {t(`compare.columns.${column}`)}
                    {active &&
                      (sort.desc ? (
                        <IconArrowDown className="size-3" />
                      ) : (
                        <IconArrowUp className="size-3" />
                      ))}
                  </button>
                </TableHead>
              );
            })}
            {costsVisible && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.guid}
              className="cursor-pointer"
              onClick={() => onSelectCollection(row.guid)}
            >
              {columns.map((column) => (
                <TableCell
                  key={column}
                  className={cn(
                    "text-sm tabular-nums",
                    column === "name" ? "max-w-56" : "text-right",
                  )}
                >
                  {cell(row, column)}
                </TableCell>
              ))}
              {costsVisible && (
                <TableCell className="py-0 text-right">
                  <Button
                    variant="ghost"
                    disabled={access?.isLocked || row.cardCount === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetCost(row);
                    }}
                  >
                    {tBusiness("reports.inventory.setCost")}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatsCollectionsSection({
  collections,
  costsVisible,
  onSelectCollection,
}: StatsCollectionsSectionProps) {
  const { t } = useTranslation("stats");
  const { format } = usePriceSource();
  const [costTarget, setCostTarget] = useState<CollectionCostTarget | null>(
    null,
  );
  const [metric, setMetric] = useState<StatsCollectionMetric>("totalValue");
  const total = collections.reduce((sum, row) => sum + row[metric], 0);
  const ranked = [...collections].sort((a, b) => b[metric] - a[metric]);

  return (
    <SettingsSection
      heading={t("compare.title")}
      description={t("compare.description")}
      action={
        <ResponsiveSegmented
          label={t("compare.title")}
          className="md:hidden"
          items={STATS_COLLECTION_METRICS.map((option) => ({
            key: option,
            label: t(`compare.metrics.${option}`),
          }))}
          value={metric}
          onChange={setMetric}
        />
      }
    >
      <div className="md:hidden">
        <BarList
          items={ranked.map((row) => ({
            key: row.guid,
            label: row.name,
            value: row[metric],
            display:
              metric === "totalValue"
                ? format(row.totalValue)
                : row[metric].toLocaleString(),
            secondary: t("compare.share", {
              percent: statsSharePercent(row[metric], total),
            }),
            onSelect: () => onSelectCollection(row.guid),
          }))}
        />
      </div>
      <StatsCollectionsTable
        collections={collections}
        costsVisible={costsVisible}
        onSelectCollection={onSelectCollection}
        onSetCost={(row) => setCostTarget({ guid: row.guid, name: row.name })}
      />
      <CollectionCostDialog
        collection={costTarget}
        onOpenChange={(open) => !open && setCostTarget(null)}
      />
    </SettingsSection>
  );
}

function StatsTopCards({ cards }: StatsTopCardsProps) {
  const { t } = useTranslation("stats");
  const { format } = usePriceSource();
  if (cards.length === 0) return null;

  return (
    <SettingsSection
      heading={t("topCards.title")}
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-5">
        {cards.map((entry) => (
          <Link
            key={entry.scanId}
            to={`/app/monitor/${entry.collectionGuid}`}
            className="flex min-w-0 flex-col gap-1.5 transition-transform active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted shadow-sm shadow-black/10 ring-1 ring-border">
              <CardImage
                src={entry.card.image?.normal || entry.card.image?.small}
                placeholderSrc={entry.card.image?.small}
                alt={entry.card.name}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {entry.card.name}
              </p>
              <p className="truncate text-xs text-foreground/70 tabular-nums">
                {entry.price != null ? format(entry.price) : null}
                <span className="text-foreground/70">
                  {" · "}
                  {entry.collectionName}
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </SettingsSection>
  );
}

export function StatsDashboard({
  report,
  onSelectCollection,
}: StatsDashboardProps) {
  const { t } = useTranslation("stats");
  const { format } = usePriceSource();
  const { totals } = report;
  const breakdown = report.breakdown ? toScanStats(report.breakdown) : null;
  const isOrg = report.scope === "org";
  const { t: tBusiness } = useTranslation("business");
  const costed = report.costsVisible && (totals.costedCount ?? 0) > 0;
  const margin = (totals.costedValue ?? 0) - (totals.costBasis ?? 0);
  const insights = buildStatsInsights(report, t, format);

  const priceColumns = report.priceBuckets.map((bucket) => ({
    key: bucket.key,
    label:
      bucket.max == null
        ? t("prices.atLeast", { min: format(bucket.min) })
        : bucket.min === 0
          ? t("prices.under", { max: format(bucket.max) })
          : t("prices.between", {
              min: format(bucket.min),
              max: format(bucket.max),
            }),
    value: bucket.count,
    detail: format(bucket.value),
  }));

  const renderSplit = (entries: StatsSplitEntry[]) => (
    <DonutChart
      segments={foldChartSegments(
        entries.map((entry) => ({
          key: entry.key,
          label: entry.label,
          value: entry.count,
          color: entry.bg,
        })),
        STATS_SPLIT_MAX_SEGMENTS,
        { key: "other", label: t("other"), color: "var(--muted-foreground)" },
      )}
      centerValue={totals.cardCount.toLocaleString()}
      centerLabel={t("tiles.cards")}
      formatShare={(value, total) =>
        t("compare.share", { percent: statsSharePercent(value, total) })
      }
    />
  );

  return (
    <div className="flex flex-col gap-6 md:gap-2">
      <DisplayHeadline
        title={t("headline.title")}
        subtitle={t("headline.subtitle")}
      />

      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ValueHero
          label={t("tiles.totalValue")}
          value={format(totals.totalValue)}
          sparklineValues={statsHeroSparklineValues(report)}
          stats={[
            { label: t("tiles.cards"), value: totals.cardCount.toLocaleString() },
            { label: t("tiles.unique"), value: totals.uniqueCount.toLocaleString() },
            { label: t("tiles.avgValue"), value: format(totals.avgValue) },
          ]}
        />
        <StatGroup
          heading={t("tiles.heading")}
          gridClassName="grid-cols-2"
          tiles={[
            {
              key: "scanned",
              icon: IconScan,
              label: t(`tiles.scanned.${report.range}`),
              value: totals.scansInRange.toLocaleString(),
              detail: t("tiles.valueAddedHint", {
                value: format(totals.valueAddedInRange),
              }),
            },
            {
              key: "priced",
              icon: IconCoins,
              label: t("tiles.priced"),
              value: totals.priceableCount.toLocaleString(),
              detail: t("tiles.shareHint", {
                percent: statsSharePercent(totals.priceableCount, totals.cardCount),
              }),
            },
            {
              key: "foils",
              icon: IconSparkles,
              label: t("tiles.foils"),
              value: totals.foilCount.toLocaleString(),
              detail: t("tiles.shareHint", {
                percent: statsSharePercent(totals.foilCount, totals.cardCount),
              }),
            },
            {
              key: "needsReview",
              icon: IconHelpCircle,
              label: t("tiles.needsReview"),
              value: totals.needsReviewCount.toLocaleString(),
              detail: t("tiles.correctedHint", { count: totals.correctedCount }),
            },
            ...(report.costsVisible
              ? [
                  {
                    key: "costBasis",
                    icon: IconCoin,
                    label: tBusiness("reports.inventory.costBasis"),
                    value: costed ? format(totals.costBasis ?? 0) : "-",
                    detail: tBusiness("reports.inventory.costedCards", {
                      percent: `${statsSharePercent(totals.costedCount ?? 0, totals.cardCount)}%`,
                    }),
                  },
                  {
                    key: "margin",
                    icon: IconChartLine,
                    label: tBusiness("reports.inventory.unrealized"),
                    value: costed ? format(margin) : "-",
                    detail: costed
                      ? `${statsSharePercent(margin, totals.costBasis ?? 0)}%`
                      : null,
                  },
                ]
              : []),
          ]}
        />
      </div>

      {costed && (totals.costedCount ?? 0) < totals.cardCount && (
        <Callout variant="info" icon={IconCoin}>
          {tBusiness("reports.inventory.uncostedNote", {
            count: totals.cardCount - (totals.costedCount ?? 0),
          })}
        </Callout>
      )}

      <StatsHighlights insights={insights} />

      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-2 [&>*]:min-w-0">
        <StatsActivitySection report={report} />
        <SettingsSection
          heading={t("prices.title")}
          description={t("prices.description")}
        >
          <ColumnChart
            data={priceColumns}
            ariaLabel={t("prices.title")}
            formatValue={(value) => t("cardCount", { count: value })}
            formatColumnValue={(value) => value.toLocaleString()}
            labelEachColumn
          />
        </SettingsSection>
      </div>

      {isOrg && report.costsVisible && report.valueHistory && (
        <StatsValueSection report={report} />
      )}

      <StatsTopCards cards={report.topCards} />

      {isOrg && (report.collections.length > 1 || report.costsVisible) && (
        <StatsCollectionsSection
          collections={report.collections}
          costsVisible={report.costsVisible}
          onSelectCollection={onSelectCollection}
        />
      )}

      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-2 [&>*]:min-w-0">
        {breakdown && breakdown.rarities.length > 0 && (
          <SettingsSection
            heading={t("rarities.title")}
            description={t("rarities.description")}
          >
            {renderSplit(breakdown.rarities)}
          </SettingsSection>
        )}

        {breakdown && breakdown.colors.length > 0 && (
          <SettingsSection
            heading={t("colors.title")}
            description={t("colors.description")}
          >
            {renderSplit(breakdown.colors)}
          </SettingsSection>
        )}

        {isOrg && report.games.length > 1 && (
          <SettingsSection heading={t("games.title")}>
            <BarList
              items={report.games.map((game) => ({
                key: game.key ?? "none",
                label: game.name ?? t("games.none"),
                value: game.totalValue,
                display: format(game.totalValue),
                secondary: t("cardCount", { count: game.cardCount }),
              }))}
            />
          </SettingsSection>
        )}

        {breakdown && breakdown.sets.length > 0 && (
          <SettingsSection heading={t("sets.title")}>
            <BarList
              items={breakdown.sets
                .slice(0, STATS_BAR_LIST_LIMIT)
                .map((set) => ({
                  key: set.code,
                  label: set.name || set.code.toUpperCase(),
                  value: set.value,
                  display: format(set.value),
                  secondary: t("cardCount", { count: set.count }),
                }))}
            />
          </SettingsSection>
        )}

        {breakdown && breakdown.foilTypes.length > 0 && (
          <SettingsSection heading={t("foils.title")}>
            <BarList
              items={breakdown.foilTypes.map((foil) => ({
                key: foil.key,
                label: foil.label,
                value: foil.count,
                display: foil.count.toLocaleString(),
              }))}
            />
          </SettingsSection>
        )}
      </div>
    </div>
  );
}
