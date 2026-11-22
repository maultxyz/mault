import { Callout } from "@/components/callout";
import { CompactPrice } from "@/components/compact-value";
import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { StatGroup } from "@/components/stat-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart } from "@/features/stats/components/area-chart";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import { BUSINESS_INVENTORY_COLUMNS } from "@/lib/constants/business";
import { collectionViewPath } from "@/lib/constants/collections";
import { STATS_PATH } from "@/lib/constants/stats";
import type {
  BusinessInventoryColumn,
  BusinessInventoryCostsProps,
} from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { statsSharePercent, type StatsCollectionRow } from "@magic-vault/shared";
import {
  IconChartLine,
  IconCoin,
  IconCoins,
  IconPercentage,
  IconTag,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatHistoryDay(day: string, locale: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function collectionMargin(row: StatsCollectionRow): number | null {
  return row.costedCount ? (row.costedValue ?? 0) - (row.costBasis ?? 0) : null;
}

export function BusinessInventoryCosts({ report, margin }: BusinessInventoryCostsProps) {
  const { t, i18n } = useTranslation("business");
  const locale = i18n.language;
  const isMobile = useIsMobile();
  const { format, formatCompact } = usePriceSource();
  const { totals } = report;
  const costedCount = totals.costedCount ?? 0;
  const isCosted = costedCount > 0;
  const hasSellMargin = !!margin && margin.costedCount > 0;
  const history = report.valueHistory ?? [];
  const rows = [...report.collections].sort((a, b) => b.totalValue - a.totalValue);

  const cell = (row: StatsCollectionRow, column: BusinessInventoryColumn) => {
    switch (column) {
      case "name":
        return (
          <Link
            to={collectionViewPath(row.guid)}
            className="truncate font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {row.name}
          </Link>
        );
      case "cardCount":
        return row.cardCount.toLocaleString(locale);
      case "totalValue":
        return format(row.totalValue);
      case "costBasis":
        return row.costedCount ? format(row.costBasis ?? 0) : "-";
      case "margin": {
        const rowMargin = collectionMargin(row);
        return rowMargin === null ? "-" : format(rowMargin);
      }
    }
  };

  return (
    <>
      <StatGroup
        heading={t("overview.inventory.heading")}
        gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        tiles={[
          {
            key: "value",
            to: STATS_PATH,
            icon: IconCoins,
            label: t("overview.inventory.value"),
            value: <CompactPrice value={totals.totalValue} />,
            detail: t("overview.cards", { count: totals.cardCount }),
          },
          {
            key: "costBasis",
            icon: IconCoin,
            label: t("reports.inventory.costBasis"),
            value: hasSellMargin ? (
              <CompactPrice value={margin.costBasis} />
            ) : isCosted ? (
              <CompactPrice value={totals.costBasis ?? 0} />
            ) : (
              "-"
            ),
            detail: t("reports.inventory.costedCards", {
              percent: `${statsSharePercent(costedCount, totals.cardCount)}%`,
            }),
          },
          {
            key: "sellValue",
            icon: IconTag,
            label: t("overview.inventory.sellValueOfCosted"),
            value: hasSellMargin ? <CompactPrice value={margin.sellValueOfCosted} /> : "-",
            detail: t("overview.inventory.sellValueDetail"),
          },
          {
            key: "unrealizedProfit",
            icon: IconChartLine,
            label: t("overview.inventory.unrealizedProfit"),
            value: hasSellMargin ? <CompactPrice value={margin.unrealizedProfit} /> : "-",
            detail:
              hasSellMargin && margin.marginPercent != null
                ? t("overview.inventory.marginPercent", { percent: margin.marginPercent })
                : null,
          },
          {
            key: "uncosted",
            icon: IconPercentage,
            label: t("overview.inventory.uncosted"),
            value: totals.cardCount - costedCount,
            detail: t("overview.inventory.uncostedDetail"),
          },
        ]}
      />

      {isCosted && costedCount < totals.cardCount && (
        <Callout variant="info" icon={IconCoin}>
          {t("reports.inventory.uncostedNote", { count: totals.cardCount - costedCount })}
        </Callout>
      )}

      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-2 [&>*]:min-w-0">
        <SettingsSection
          heading={t("reports.inventory.history")}
          description={t("overview.inventory.historyDescription")}
        >
          {history.length < 2 ? (
            <EmptyState
              size="compact"
              icon={IconChartLine}
              title={t("reports.inventory.historyEmpty")}
              description={t("reports.inventory.historyEmptyDescription")}
            />
          ) : (
            <AreaChart
              ariaLabel={t("reports.inventory.history")}
              formatValue={format}
              formatAxisValue={formatCompact}
              data={history.map((point) => ({
                key: point.day,
                label: formatHistoryDay(point.day, locale),
                value: point.marketValue,
              }))}
            />
          )}
        </SettingsSection>

        <SettingsSection
          heading={t("overview.inventory.collectionsTitle")}
          description={t("overview.inventory.collectionsDescription")}
        >
          <p className="pb-2 text-xs text-foreground/70 md:pb-1.5">
            {t("overview.inventory.setCostsHint")}
          </p>
          {isMobile ? (
            <ul className="flex flex-col divide-y divide-border">
              {rows.map((row) => (
                <li key={row.guid} className="flex items-center gap-2 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{row.name}</span>
                    <span className="text-xs text-foreground/70">
                      {t("overview.inventory.rowSummary", {
                        value: format(row.totalValue),
                        cost: row.costedCount ? format(row.costBasis ?? 0) : "-",
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {BUSINESS_INVENTORY_COLUMNS.map((column) => (
                      <TableHead
                        key={column}
                        className={cn("text-xs", column !== "name" && "text-right")}
                      >
                        {t(`overview.inventory.columns.${column}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.guid}>
                      {BUSINESS_INVENTORY_COLUMNS.map((column) => (
                        <TableCell
                          key={column}
                          className={cn(
                            "text-sm tabular-nums",
                            column === "name" ? "max-w-48" : "text-right",
                          )}
                        >
                          {cell(row, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SettingsSection>
      </div>
    </>
  );
}
