import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inventoryReportQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { CollectionCostDialog } from "@/features/business/components/collection-cost-dialog";
import { formatDay, formatPercent } from "@/features/business/lib/format";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { usePriceSource } from "@/hooks/use-price-source";
import type { InventoryCollectionRow } from "@magic-vault/shared";
import { IconChartLine, IconCoin } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function InventoryReportView() {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { orgId, access } = useBusinessAccess();
  const { data: report, isLoading } = useQuery(
    inventoryReportQueryOptions(orgId),
  );
  const [costTarget, setCostTarget] = useState<InventoryCollectionRow | null>(
    null,
  );

  if (isLoading || !report) return <ListSkeleton rows={8} />;

  const { totals } = report;
  const unrealized = totals.costedMarketValue - totals.costBasis;

  return (
    <div className="flex flex-col gap-4">
      <StatGroup
        heading={t("reports.inventory.heading")}
        gridClassName="grid-cols-2 sm:grid-cols-4"
        tiles={[
          {
            key: "value",
            label: t("reports.inventory.marketValue"),
            value: format(totals.marketValue),
            detail: t("intake.cardCount", { count: totals.cardCount }),
          },
          {
            key: "cost",
            label: t("reports.inventory.costBasis"),
            value: format(totals.costBasis),
            detail: t("reports.inventory.costedCards", {
              percent: formatPercent(
                totals.cardCount ? totals.costedCards / totals.cardCount : null,
              ),
            }),
          },
          {
            key: "margin",
            label: t("reports.inventory.unrealized"),
            value: format(unrealized),
            detail: formatPercent(
              totals.costBasis ? unrealized / totals.costBasis : null,
            ),
          },
          {
            key: "costedValue",
            label: t("reports.inventory.costedValue"),
            value: format(totals.costedMarketValue),
          },
        ]}
      />

      {totals.cardCount > 0 && totals.costedCards < totals.cardCount && (
        <Callout variant="info" icon={IconCoin}>
          {t("reports.inventory.uncostedNote", {
            count: totals.cardCount - totals.costedCards,
          })}
        </Callout>
      )}

      <section className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="font-heading text-sm font-semibold">
          {t("reports.inventory.history")}
        </h2>
        {report.history.length < 2 ? (
          <EmptyState
            size="compact"
            icon={IconChartLine}
            title={t("reports.inventory.historyEmpty")}
            description={t("reports.inventory.historyEmptyDescription")}
          />
        ) : (
          <ColumnChart
            ariaLabel={t("reports.inventory.history")}
            formatValue={format}
            data={report.history.map((point) => ({
              key: point.day,
              label: formatDay(point.day),
              value: point.marketValue,
            }))}
          />
        )}
      </section>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.collection")}</TableHead>
              <TableHead className="text-right">{t("table.cards")}</TableHead>
              <TableHead className="text-right">{t("table.market")}</TableHead>
              <TableHead className="text-right">{t("table.cost")}</TableHead>
              <TableHead className="text-right">{t("table.margin")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.collections.map((row) => (
              <TableRow key={row.guid}>
                <TableCell className="max-w-56 truncate font-medium">
                  {row.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.cardCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {format(row.marketValue)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.costedCards > 0 ? format(row.costBasis) : "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.costedCards > 0
                    ? format(row.costedMarketValue - row.costBasis)
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={access?.isLocked || row.cardCount === 0}
                    onClick={() => setCostTarget(row)}
                  >
                    {t("reports.inventory.setCost")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CollectionCostDialog
        collection={costTarget}
        onOpenChange={(open) => !open && setCostTarget(null)}
      />
    </div>
  );
}
