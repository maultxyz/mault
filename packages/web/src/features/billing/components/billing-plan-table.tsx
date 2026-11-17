import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillingPlanTableProps } from "@/lib/interfaces/billing";
import { cn } from "@/lib/utils";
import {
  billingPlanRowUsagePercent,
  billingPlanTableRows,
  type BillingPlanTableRow,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function BillingPlanTable({ billing }: BillingPlanTableProps) {
  const { t } = useTranslation("billing");
  const rows = billingPlanTableRows(billing);

  const offeringText = (row: BillingPlanTableRow) => {
    if (row.kind === "feature") {
      return row.included
        ? t("planTable.included")
        : t("planTable.notIncluded");
    }
    if (row.limit == null) return t("planTable.unlimited");
    if (row.limit === 0) return t("planTable.notIncluded");
    return String(row.limit);
  };

  const usageText = (row: BillingPlanTableRow) => {
    if (row.used == null) return t("planTable.noUsage");
    return row.kind === "limit" && row.key === "dailyScans"
      ? t("planTable.usedToday", { count: row.used })
      : String(row.used);
  };

  const isUnavailable = (row: BillingPlanTableRow) =>
    row.kind === "feature" ? !row.included : row.limit === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("planTable.columns.offering")}</TableHead>
              <TableHead>{t("planTable.columns.yourPlan")}</TableHead>
              <TableHead>{t("planTable.columns.usage")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const usagePercent = billingPlanRowUsagePercent(row);
              return (
                <TableRow key={`${row.kind}-${row.key}`}>
                  <TableCell>{t(`planTable.rows.${row.key}`)}</TableCell>
                  <TableCell
                    className={cn(
                      "tabular-nums",
                      isUnavailable(row) && "text-foreground/70",
                    )}
                  >
                    {offeringText(row)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(row.used == null && "text-foreground/70")}
                      >
                        {usageText(row)}
                      </span>
                      {usagePercent != null && (
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {billing.cardsScannedThisMonth != null && (
        <p className="text-xs text-foreground/70">
          {t("planTable.scansThisMonth", {
            count: billing.cardsScannedThisMonth,
          })}
        </p>
      )}
    </div>
  );
}
