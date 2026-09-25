import { useTranslation } from "react-i18next";
import { formatUsd } from "@/lib/format";
import type { CardPriceDetailsProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";

export function CardPriceDetails({ card, className }: CardPriceDetailsProps) {
  const { t } = useTranslation("cards");

  const rows = [
    {
      label: t("priceTable.regular"),
      low: card.priceRange?.low ?? null,
      mid: card.priceRange?.mid ?? card.price,
      high: card.priceRange?.high ?? null,
    },
    {
      label: t("priceTable.foil"),
      low: card.priceRangeFoil?.low ?? null,
      mid: card.priceRangeFoil?.mid ?? card.priceFoil,
      high: card.priceRangeFoil?.high ?? null,
    },
  ].filter((row) => row.low != null || row.mid != null || row.high != null);

  if (rows.length === 0) return null;

  const printings = Math.max(
    card.priceRange?.printings ?? 1,
    card.priceRangeFoil?.printings ?? 1,
  );

  const formatOptional = (value: number | null) =>
    value != null ? formatUsd(value) : t("priceTable.noPrice");

  return (
    <div className={cn("rounded-md bg-muted px-4 py-2 w-fit text-sm", className)}>
      <table className="tabular-nums">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-6 text-left font-normal">
              {t("priceTable.heading")}
            </th>
            <th className="px-4 py-2 text-right font-normal">
              {t("priceTable.low")}
            </th>
            <th className="px-4 py-2 text-right font-normal">
              {t("priceTable.mid")}
            </th>
            <th className="py-2 pl-4 text-right font-normal">
              {t("priceTable.high")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-2 pr-6 text-muted-foreground">{row.label}</td>
              <td className="px-4 py-2 text-right">
                {formatOptional(row.low)}
              </td>
              <td className="px-4 py-2 text-right font-semibold">
                {formatOptional(row.mid)}
              </td>
              <td className="py-2 pl-4 text-right">
                {formatOptional(row.high)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {printings > 1 && (
        <p className="pt-2 text-xs text-muted-foreground">
          {t("priceTable.acrossPrintings", { count: printings })}
        </p>
      )}
    </div>
  );
}
