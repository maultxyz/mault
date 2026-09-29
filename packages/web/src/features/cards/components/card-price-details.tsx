import { useTranslation } from "react-i18next";
import { usePriceSource } from "@/hooks/use-price-source";
import { formatEur, formatUsd } from "@/lib/format";
import type {
  CardPriceDetailsProps,
  PriceTableProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";

function PriceTable({
  heading,
  columns,
  rows,
  printings,
  format,
}: PriceTableProps) {
  const { t } = useTranslation("cards");
  const visibleRows = rows.filter((row) =>
    row.values.some((value) => value != null),
  );
  if (visibleRows.length === 0) return null;

  const formatOptional = (value: number | null) =>
    value != null ? format(value) : t("priceTable.noPrice");

  return (
    <div>
      <table className="tabular-nums">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-6 text-left font-normal">{heading}</th>
            {columns.map((column, i) => (
              <th
                key={column}
                className={cn(
                  "py-2 text-right font-normal",
                  i === columns.length - 1 ? "pl-4" : "px-4",
                )}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visibleRows.map((row) => (
            <tr key={row.label}>
              <td className="py-2 pr-6 text-muted-foreground">{row.label}</td>
              {row.values.map((value, i) => (
                <td
                  key={columns[i]}
                  className={cn(
                    "py-2 text-right",
                    i === row.values.length - 1 ? "pl-4" : "px-4",
                    i === 1 && "font-semibold",
                  )}
                >
                  {formatOptional(value)}
                </td>
              ))}
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

export function CardPriceDetails({ card, className }: CardPriceDetailsProps) {
  const { t } = useTranslation("cards");
  const { source } = usePriceSource();

  const tcgplayerRows = [
    {
      label: t("priceTable.regular"),
      values: [
        card.priceRange?.low ?? null,
        card.priceRange?.mid ?? card.price,
        card.priceRange?.high ?? null,
      ],
    },
    {
      label: t("priceTable.foil"),
      values: [
        card.priceRangeFoil?.low ?? null,
        card.priceRangeFoil?.mid ?? card.priceFoil,
        card.priceRangeFoil?.high ?? null,
      ],
    },
  ];
  const cardmarketRows = [
    {
      label: t("priceTable.regular"),
      values: [
        card.cardmarketPrice?.low ?? null,
        card.cardmarketPrice?.trend ?? card.priceEur ?? null,
        card.cardmarketPrice?.avg30 ?? null,
      ],
    },
    {
      label: t("priceTable.foil"),
      values: [
        card.cardmarketPriceFoil?.low ?? null,
        card.cardmarketPriceFoil?.trend ?? card.priceEurFoil ?? null,
        card.cardmarketPriceFoil?.avg30 ?? null,
      ],
    },
  ];

  const hasAnyPrice = [...tcgplayerRows, ...cardmarketRows].some((row) =>
    row.values.some((value) => value != null),
  );
  if (!hasAnyPrice) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md bg-muted px-4 py-2 w-fit text-sm",
        source === "cardmarket" && "flex-col-reverse",
        className,
      )}
    >
      <PriceTable
        heading={t("priceTable.heading")}
        columns={[
          t("priceTable.low"),
          t("priceTable.mid"),
          t("priceTable.high"),
        ]}
        rows={tcgplayerRows}
        printings={Math.max(
          card.priceRange?.printings ?? 1,
          card.priceRangeFoil?.printings ?? 1,
        )}
        format={formatUsd}
      />
      <PriceTable
        heading={t("priceTable.cardmarketHeading")}
        columns={[
          t("priceTable.from"),
          t("priceTable.trend"),
          t("priceTable.avg30"),
        ]}
        rows={cardmarketRows}
        printings={Math.max(
          card.cardmarketPrice?.printings ?? 1,
          card.cardmarketPriceFoil?.printings ?? 1,
        )}
        format={formatEur}
      />
    </div>
  );
}
