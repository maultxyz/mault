import { usePriceSource } from "@/hooks/use-price-source";
import { CARD_PRICE_TABLES_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { formatEur, formatUsd } from "@/lib/format";
import type {
  CardPriceDetailsProps,
  PriceHeadlineProps,
  PriceSourceSection,
  PriceTableProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function readTablesOpen(): boolean {
  try {
    return localStorage.getItem(CARD_PRICE_TABLES_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeTablesOpen(open: boolean): void {
  try {
    localStorage.setItem(CARD_PRICE_TABLES_STORAGE_KEY, String(open));
  } catch {
    return;
  }
}

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
        <p className="pt-2 text-2xs text-foreground/70">
          {t("priceTable.acrossPrintings", { count: printings })}
        </p>
      )}
    </div>
  );
}

function PriceHeadline({
  label,
  price,
  foilPrice,
  isFoil,
  format,
}: PriceHeadlineProps) {
  const { t } = useTranslation("cards");
  if (price == null && foilPrice == null) return null;

  const showFoil = isFoil && foilPrice != null;
  const headline = showFoil ? foilPrice : price;
  const secondary = showFoil ? price : foilPrice;
  const secondaryKey = showFoil
    ? "priceTable.nonFoilPrice"
    : "priceTable.foilPrice";

  return (
    <div className="flex min-w-36 flex-col gap-0.5 rounded-md bg-muted px-3 py-2">
      <span className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
        {label}
      </span>
      <span className="font-heading text-sm font-semibold tabular-nums">
        {headline != null ? format(headline) : t("priceTable.noPrice")}
      </span>
      {secondary != null && (
        <span className="text-2xs tabular-nums text-foreground/70">
          {t(secondaryKey, { price: format(secondary) })}
        </span>
      )}
    </div>
  );
}

export function CardPriceDetails({
  card,
  isFoil = false,
  className,
}: CardPriceDetailsProps) {
  const { t } = useTranslation("cards");
  const { source } = usePriceSource();
  const [tablesOpen, setTablesOpen] = useState(readTablesOpen);

  const toggleTables = () => {
    setTablesOpen((open) => {
      writeTablesOpen(!open);
      return !open;
    });
  };

  const sections: PriceSourceSection[] = [
    {
      source: "tcgplayer",
      headline: {
        label: t("priceTable.tcgplayerMarket"),
        price: card.price,
        foilPrice: card.priceFoil,
        format: formatUsd,
      },
      table: {
        heading: t("priceTable.heading"),
        columns: [
          t("priceTable.low"),
          t("priceTable.mid"),
          t("priceTable.market"),
          t("priceTable.high"),
        ],
        rows: [
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
        ],
        printings: Math.max(
          card.priceRange?.printings ?? 1,
          card.priceRangeFoil?.printings ?? 1,
        ),
        highlightColumn: 2,
        format: formatUsd,
      },
    },
    {
      source: "cardmarket",
      headline: {
        label: t("priceTable.cardmarketAvg"),
        price: card.priceEur ?? null,
        foilPrice: card.priceEurFoil ?? null,
        format: formatEur,
      },
      table: {
        heading: t("priceTable.cardmarketHeading"),
        columns: [
          t("priceTable.low"),
          t("priceTable.trend"),
          t("priceTable.avg"),
          t("priceTable.avg7"),
          t("priceTable.avg30"),
        ],
        rows: [
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
        ],
        printings: Math.max(
          card.cardmarketPrice?.printings ?? 1,
          card.cardmarketPriceFoil?.printings ?? 1,
        ),
        highlightColumn: 2,
        format: formatEur,
      },
    },
    {
      source: "cardkingdom",
      headline: {
        label: t("priceTable.cardKingdomRetail"),
        price: card.priceCardKingdom ?? null,
        foilPrice: card.priceCardKingdomFoil ?? null,
        format: formatUsd,
      },
      table: {
        heading: t("priceTable.cardKingdomHeading"),
        columns: [t("priceTable.retail"), t("priceTable.buylist")],
        rows: [
          {
            label: t("priceTable.regular"),
            values: [
              card.cardKingdomPrice?.retail ?? card.priceCardKingdom ?? null,
              card.cardKingdomPrice?.buylist ?? null,
            ],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.cardKingdomPriceFoil?.retail ??
                card.priceCardKingdomFoil ??
                null,
              card.cardKingdomPriceFoil?.buylist ?? null,
            ],
          },
        ],
        printings: 1,
        highlightColumn: 0,
        format: formatUsd,
      },
    },
  ];

  const hasAnyPrice = sections.some(({ table }) =>
    table.rows.some((row) => row.values.some((value) => value != null)),
  );
  if (!hasAnyPrice) return null;

  const ordered = [
    ...sections.filter((section) => section.source === source),
    ...sections.filter((section) => section.source !== source),
  ];

  return (
    <div className={cn("flex flex-col gap-2 text-xs", className)}>
      <div className="flex flex-wrap gap-2">
        {ordered.map(({ source: key, headline }) => (
          <PriceHeadline key={key} {...headline} isFoil={isFoil} />
        ))}
      </div>
      <button
        type="button"
        onClick={toggleTables}
        aria-expanded={tablesOpen}
        className="flex w-fit items-center gap-1 rounded-sm font-medium text-foreground/70 hover:text-foreground"
      >
        <IconChevronDown
          className={cn(
            "size-3.5 transition-transform motion-reduce:transition-none",
            !tablesOpen && "-rotate-90",
          )}
        />
        {t(tablesOpen ? "priceTable.hideDetails" : "priceTable.showDetails")}
      </button>
      {tablesOpen && (
        <div className="flex max-w-full flex-col gap-3 rounded-md bg-muted px-4 py-2 w-fit">
          {ordered.map(({ source: key, table }) => (
            <PriceTable key={key} {...table} />
          ))}
        </div>
      )}
    </div>
  );
}
