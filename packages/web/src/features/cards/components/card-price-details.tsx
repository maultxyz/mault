import { useTranslation } from "react-i18next";
import { usePriceSource } from "@/hooks/use-price-source";
import { formatEur, formatUsd } from "@/lib/format";
import type {
  CardPriceDetailsProps,
  PriceHeadlineProps,
  PriceTableProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";

function PriceTable({
  heading,
  columns,
  rows,
  printings,
  highlightColumn,
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
    <div className="max-w-full overflow-x-auto">
      <table className="tabular-nums">
        <thead>
          <tr className="border-b border-border text-foreground/70">
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
              <td className="py-2 pr-6 text-foreground/70">{row.label}</td>
              {row.values.map((value, i) => (
                <td
                  key={columns[i]}
                  className={cn(
                    "py-2 text-right",
                    i === row.values.length - 1 ? "pl-4" : "px-4",
                    i === highlightColumn && "font-semibold",
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
        <p className="pt-2 text-xs text-foreground/70">
          {t("priceTable.acrossPrintings", { count: printings })}
        </p>
      )}
    </div>
  );
}

function PriceHeadline({ label, price, foilPrice, format }: PriceHeadlineProps) {
  const { t } = useTranslation("cards");
  if (price == null && foilPrice == null) return null;

  return (
    <div className="flex min-w-36 flex-col gap-0.5 rounded-md border bg-muted px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
        {label}
      </span>
      <span className="font-heading text-lg font-semibold tabular-nums">
        {price != null ? format(price) : t("priceTable.noPrice")}
      </span>
      {foilPrice != null && (
        <span className="text-xs tabular-nums text-foreground/70">
          {t("priceTable.foilPrice", { price: format(foilPrice) })}
        </span>
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
        card.priceRange?.mid ?? null,
        card.priceRange?.market ?? card.price,
        card.priceRange?.high ?? null,
      ],
    },
    {
      label: t("priceTable.foil"),
      values: [
        card.priceRangeFoil?.low ?? null,
        card.priceRangeFoil?.mid ?? null,
        card.priceRangeFoil?.market ?? card.priceFoil,
        card.priceRangeFoil?.high ?? null,
      ],
    },
  ];
  const cardmarketRows = [
    {
      label: t("priceTable.regular"),
      values: [
        card.cardmarketPrice?.low ?? null,
        card.cardmarketPrice?.trend ?? null,
        card.cardmarketPrice?.avg ?? card.priceEur ?? null,
        card.cardmarketPrice?.avg7 ?? null,
        card.cardmarketPrice?.avg30 ?? null,
      ],
    },
    {
      label: t("priceTable.foil"),
      values: [
        card.cardmarketPriceFoil?.low ?? null,
        card.cardmarketPriceFoil?.trend ?? null,
        card.cardmarketPriceFoil?.avg ?? card.priceEurFoil ?? null,
        card.cardmarketPriceFoil?.avg7 ?? null,
        card.cardmarketPriceFoil?.avg30 ?? null,
      ],
    },
  ];

  const hasAnyPrice = [...tcgplayerRows, ...cardmarketRows].some((row) =>
    row.values.some((value) => value != null),
  );
  if (!hasAnyPrice) return null;

  const reversed = source === "cardmarket" && "flex-row-reverse justify-end";

  return (
    <div className={cn("flex flex-col gap-3 text-sm", className)}>
      <div className={cn("flex flex-wrap gap-2", reversed)}>
        <PriceHeadline
          label={t("priceTable.tcgplayerMarket")}
          price={card.price}
          foilPrice={card.priceFoil}
          format={formatUsd}
        />
        <PriceHeadline
          label={t("priceTable.cardmarketAvg")}
          price={card.priceEur ?? null}
          foilPrice={card.priceEurFoil ?? null}
          format={formatEur}
        />
      </div>
      <div
        className={cn(
          "flex max-w-full flex-col gap-3 rounded-md bg-muted px-4 py-2 w-fit",
          source === "cardmarket" && "flex-col-reverse",
        )}
      >
        <PriceTable
          heading={t("priceTable.heading")}
          columns={[
            t("priceTable.low"),
            t("priceTable.mid"),
            t("priceTable.market"),
            t("priceTable.high"),
          ]}
          rows={tcgplayerRows}
          printings={Math.max(
            card.priceRange?.printings ?? 1,
            card.priceRangeFoil?.printings ?? 1,
          )}
          highlightColumn={2}
          format={formatUsd}
        />
        <PriceTable
          heading={t("priceTable.cardmarketHeading")}
          columns={[
            t("priceTable.low"),
            t("priceTable.trend"),
            t("priceTable.avg"),
            t("priceTable.avg7"),
            t("priceTable.avg30"),
          ]}
          rows={cardmarketRows}
          printings={Math.max(
            card.cardmarketPrice?.printings ?? 1,
            card.cardmarketPriceFoil?.printings ?? 1,
          )}
          highlightColumn={2}
          format={formatEur}
        />
      </div>
    </div>
  );
}
