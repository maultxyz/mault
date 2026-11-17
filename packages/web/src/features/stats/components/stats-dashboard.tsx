import { FoilOverlay } from "@/components/foil-overlay";
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
import { BarList } from "@/features/stats/components/bar-list";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  STATS_ACTIVITY_METRICS,
  STATS_BAR_LIST_LIMIT,
  STATS_COLLECTION_COST_COLUMNS,
  STATS_COLLECTION_METRICS,
  STATS_COLLECTION_TABLE_COLUMNS,
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
import type { StatsCollectionRow } from "@magic-vault/shared";
import {
  IconArrowDown,
  IconArrowUp,
  IconChartLine,
  IconCoin,
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

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function StatsActivitySection({ report }: StatsActivitySectionProps) {
  const { t } = useTranslation("stats");
  const { format } = usePriceSource();
  const [metric, setMetric] = useState<StatsActivityMetric>("count");
  const isWeekly = report.bucket === "week";

  return (
    <SettingsSection
      className="bg-card"
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
      <ColumnChart
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
      className="bg-card"
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
        <ColumnChart
          ariaLabel={tBusiness("reports.inventory.history")}
          formatValue={format}
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
      className="bg-card"
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
              percent: percent(row[metric], total),
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
      className="rounded-none border-0 p-0 pt-2"
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
              <img
                src={entry.card.image?.normal || entry.card.image?.small || ""}
                alt={entry.card.name}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
              />
              {entry.isFoil && <FoilOverlay />}
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

  const priceItems = report.priceBuckets.map((bucket) => ({
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
    display: bucket.count.toLocaleString(),
    secondary: format(bucket.value),
  }));

  return (
    <div className="flex flex-col gap-4">
      <StatGroup
        heading={t("tiles.heading")}
        gridClassName={
          report.costsVisible
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
        }
        tiles={[
          {
            key: "totalValue",
            label: t("tiles.totalValue"),
            value: format(totals.totalValue),
            detail: isOrg
              ? t("tiles.collectionCount", { count: totals.collectionCount })
              : undefined,
          },
          {
            key: "cards",
            label: t("tiles.cards"),
            value: totals.cardCount.toLocaleString(),
            detail: t("tiles.uniqueHint", { count: totals.uniqueCount }),
          },
          {
            key: "avgValue",
            label: t("tiles.avgValue"),
            value: format(totals.avgValue),
            detail: t("tiles.pricedHint", { count: totals.priceableCount }),
          },
          {
            key: "scanned",
            label: t(`tiles.scanned.${report.range}`),
            value: totals.scansInRange.toLocaleString(),
            detail: t("tiles.valueAddedHint", {
              value: format(totals.valueAddedInRange),
            }),
          },
          {
            key: "foils",
            label: t("tiles.foils"),
            value: totals.foilCount.toLocaleString(),
            detail: t("tiles.shareHint", {
              percent: percent(totals.foilCount, totals.cardCount),
            }),
          },
          {
            key: "needsReview",
            label: t("tiles.needsReview"),
            value: totals.needsReviewCount.toLocaleString(),
            detail: t("tiles.correctedHint", { count: totals.correctedCount }),
          },
          ...(report.costsVisible
            ? [
                {
                  key: "costBasis",
                  label: tBusiness("reports.inventory.costBasis"),
                  value: costed ? format(totals.costBasis ?? 0) : "-",
                  detail: tBusiness("reports.inventory.costedCards", {
                    percent: `${percent(totals.costedCount ?? 0, totals.cardCount)}%`,
                  }),
                },
                {
                  key: "margin",
                  label: tBusiness("reports.inventory.unrealized"),
                  value: costed ? format(margin) : "-",
                  detail: costed
                    ? `${percent(margin, totals.costBasis ?? 0)}%`
                    : null,
                },
              ]
            : []),
        ]}
      />

      {costed && (totals.costedCount ?? 0) < totals.cardCount && (
        <Callout variant="info" icon={IconCoin}>
          {tBusiness("reports.inventory.uncostedNote", {
            count: totals.cardCount - (totals.costedCount ?? 0),
          })}
        </Callout>
      )}

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <StatsActivitySection report={report} />
        <SettingsSection
          className="bg-card"
          heading={t("prices.title")}
          description={t("prices.description")}
        >
          <BarList items={priceItems} />
        </SettingsSection>
      </div>

      {isOrg && report.costsVisible && report.valueHistory && (
        <StatsValueSection report={report} />
      )}

      {isOrg && (report.collections.length > 1 || report.costsVisible) && (
        <StatsCollectionsSection
          collections={report.collections}
          costsVisible={report.costsVisible}
          onSelectCollection={onSelectCollection}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {isOrg && report.games.length > 1 && (
          <SettingsSection className="bg-card" heading={t("games.title")}>
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
          <SettingsSection className="bg-card" heading={t("sets.title")}>
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

        {breakdown && breakdown.rarities.length > 0 && (
          <SettingsSection className="bg-card" heading={t("rarities.title")}>
            <BarList
              items={breakdown.rarities.map((rarity) => ({
                key: rarity.key,
                label: rarity.label,
                value: rarity.count,
                display: rarity.count.toLocaleString(),
                secondary: t("compare.share", {
                  percent: percent(rarity.count, totals.cardCount),
                }),
                swatch: rarity.bg,
              }))}
            />
          </SettingsSection>
        )}

        {breakdown && breakdown.colors.length > 0 && (
          <SettingsSection className="bg-card" heading={t("colors.title")}>
            <BarList
              items={breakdown.colors.map((color) => ({
                key: color.key,
                label: color.label,
                value: color.count,
                display: color.count.toLocaleString(),
                secondary: t("compare.share", {
                  percent: percent(color.count, totals.cardCount),
                }),
                swatch: color.bg,
              }))}
            />
          </SettingsSection>
        )}

        {breakdown && breakdown.foilTypes.length > 0 && (
          <SettingsSection className="bg-card" heading={t("foils.title")}>
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

      <StatsTopCards cards={report.topCards} />
    </div>
  );
}
