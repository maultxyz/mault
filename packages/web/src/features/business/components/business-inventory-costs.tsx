import { CompactPrice } from "@/components/compact-value";
import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
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
import type {
  BusinessInventoryColumn,
  BusinessInventoryCostsProps,
  BusinessInventoryValueChartProps,
} from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { statsSharePercent, type StatsCollectionRow } from "@magic-vault/shared";
import { IconChartLine } from "@tabler/icons-react";
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

export function BusinessInventoryValueChart({ report }: BusinessInventoryValueChartProps) {
  const { t, i18n } = useTranslation("business");
  const { format, formatCompact } = usePriceSource();
  const history = report.valueHistory ?? [];

  return (
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
            label: formatHistoryDay(point.day, i18n.language),
            value: point.marketValue,
          }))}
        />
      )}
    </SettingsSection>
  );
}

export function BusinessInventoryCosts({ report, margin }: BusinessInventoryCostsProps) {
  const { t, i18n } = useTranslation("business");
  const locale = i18n.language;
  const isMobile = useIsMobile();
  const { format } = usePriceSource();
  const { totals } = report;
  const costedCount = totals.costedCount ?? 0;
  const hasSellMargin = !!margin && margin.costedCount > 0;
  const costBasis = hasSellMargin
    ? margin.costBasis
    : costedCount > 0
      ? (totals.costBasis ?? 0)
      : null;
  const rows = [...report.collections].sort((a, b) => b.totalValue - a.totalValue);
  const summary = [
    {
      key: "costBasis",
      label: t("reports.inventory.costBasis"),
      value: costBasis != null ? <CompactPrice value={costBasis} /> : "-",
    },
    {
      key: "sellValue",
      label: t("overview.inventory.sellValueOfCosted"),
      value: hasSellMargin ? <CompactPrice value={margin.sellValueOfCosted} /> : "-",
    },
    {
      key: "uncosted",
      label: t("overview.inventory.uncosted"),
      value: t("overview.inventory.uncostedValue", {
        cards: (totals.cardCount - costedCount).toLocaleString(locale),
        percent: 100 - statsSharePercent(costedCount, totals.cardCount),
      }),
    },
  ];

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
    <SettingsSection
      heading={t("overview.inventory.collectionsTitle")}
      description={t("overview.inventory.collectionsDescription")}
    >
      <dl className="grid grid-cols-3 gap-2">
        {summary.map((item) => (
          <div key={item.key} className="flex flex-col rounded-lg bg-foreground/6 px-3 py-2 md:px-2 md:py-1.5">
            <dt className="text-xs text-foreground/70">{item.label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      {costedCount < totals.cardCount && (
        <p className="text-xs text-foreground/70">{t("overview.inventory.setCostsHint")}</p>
      )}
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
  );
}
