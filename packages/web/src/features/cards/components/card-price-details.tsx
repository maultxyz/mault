import { usePriceSource } from "@/hooks/use-price-source";
import { formatEur, formatUsd } from "@/lib/format";
import type {
  CardPriceDetailsProps,
  PriceHeadlineProps,
  PriceSourceSection,
  PriceTableProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import {
  CARD_CONDITIONS,
  priceChangeSinceScan,
  tcgplayerHeadlinePrices,
} from "@magic-vault/shared";
import { MissingPrice } from "@/components/missing-price";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function PriceTable({
  heading,
  columns,
  rows,
  highlightColumn,
  format,
  missingValueLabel,
}: PriceTableProps) {
  const visibleRows = rows.filter((row) =>
    row.values.some((value) => value != null),
  );
  if (visibleRows.length === 0) return null;

  const formatOptional = (value: number | null) =>
    value != null ? format(value) : <MissingPrice label={missingValueLabel} />;

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
    </div>
  );
}

function PriceHeadline({
  label,
  price,
  foilPrice,
  priceAtScan,
  foilPriceAtScan,
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
  const headlineAtScan = showFoil ? foilPriceAtScan : priceAtScan;
  const changeSinceScan = priceChangeSinceScan(headlineAtScan, headline);

  return (
    <div className="flex min-w-36 flex-col gap-0.5 rounded-lg bg-foreground/6 px-3 py-2">
      <span className="text-xs font-medium text-foreground/70">
        {label}
      </span>
      <span className="font-heading text-sm font-semibold tabular-nums">
        {headline != null ? format(headline) : <MissingPrice />}
      </span>
      {secondary != null && (
        <span className="text-2xs tabular-nums text-foreground/70">
          {t(secondaryKey, { price: format(secondary) })}
        </span>
      )}
      {headlineAtScan != null && changeSinceScan && (
        <span className="text-2xs tabular-nums text-foreground/70">
          {t("priceTable.priceAtScan", { price: format(headlineAtScan) })}{" "}
          <span
            className={cn(
              "font-medium",
              changeSinceScan.direction === "up"
                ? "text-success-foreground"
                : "text-destructive-strong dark:text-destructive",
            )}
          >
            {changeSinceScan.percentLabel}
          </span>
        </span>
      )}
    </div>
  );
}

export function CardPriceDetails({
  card,
  isFoil = false,
  foilType,
  stamp,
  condition,
  className,
}: CardPriceDetailsProps) {
  const { t, i18n } = useTranslation("cards");
  const { source } = usePriceSource();
  const [tablesOpen, setTablesOpen] = useState(false);

  const toggleTables = () => setTablesOpen((open) => !open);
  const { isConditionPrice, ...tcgplayerHeadline } = tcgplayerHeadlinePrices(
    card,
    foilType,
    condition,
    stamp,
  );

  const sections: PriceSourceSection[] = [
    {
      source: "tcgplayer",
      headline: {
        label: isConditionPrice
          ? t("priceTable.tcgplayerMarketCondition", { condition })
          : t("priceTable.tcgplayerMarket"),
        ...tcgplayerHeadline,
        format: formatUsd,
      },
      table: {
        heading: t("priceTable.heading"),
        columns: [t("priceTable.low"), t("priceTable.market")],
        rows: [
          {
            label: t("priceTable.regular"),
            values: [
              card.priceRange?.low ?? null,
              card.priceRange ? card.priceRange.market : card.price,
            ],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.priceRangeFoil?.low ?? null,
              card.priceRangeFoil ? card.priceRangeFoil.market : card.priceFoil,
            ],
          },
        ],
        highlightColumn: 1,
        format: formatUsd,
      },
      extraTables: [
        {
          heading: t("priceTable.listingsHeading"),
          columns: CARD_CONDITIONS,
          rows: [
            {
              label: t("priceTable.regular"),
              values: CARD_CONDITIONS.map(
                (listingCondition) =>
                  card.listingCountByCondition?.[listingCondition] ?? null,
              ),
            },
            {
              label: t("priceTable.foil"),
              values: CARD_CONDITIONS.map(
                (listingCondition) =>
                  card.listingCountFoilByCondition?.[listingCondition] ?? null,
              ),
            },
          ],
          highlightColumn: CARD_CONDITIONS.indexOf(condition ?? "NM"),
          format: (listingCount) => listingCount.toLocaleString(i18n.language),
          missingValueLabel: t("priceTable.noListings"),
        },
      ],
    },
    {
      source: "cardmarket",
      headline: {
        label: t("priceTable.cardmarketAvg"),
        price: card.priceEur ?? null,
        foilPrice: card.priceEurFoil ?? null,
        priceAtScan: card.pricesAtScan?.priceEur,
        foilPriceAtScan: card.pricesAtScan?.priceEurFoil,
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
              card.cardmarketPrice
                ? card.cardmarketPrice.avg
                : (card.priceEur ?? null),
              card.cardmarketPrice?.avg7 ?? null,
              card.cardmarketPrice?.avg30 ?? null,
            ],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.cardmarketPriceFoil?.low ?? null,
              card.cardmarketPriceFoil?.trend ?? null,
              card.cardmarketPriceFoil
                ? card.cardmarketPriceFoil.avg
                : (card.priceEurFoil ?? null),
              card.cardmarketPriceFoil?.avg7 ?? null,
              card.cardmarketPriceFoil?.avg30 ?? null,
            ],
          },
        ],
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
        priceAtScan: card.pricesAtScan?.priceCardKingdom,
        foilPriceAtScan: card.pricesAtScan?.priceCardKingdomFoil,
        format: formatUsd,
      },
      table: {
        heading: t("priceTable.cardKingdomHeading"),
        columns: [t("priceTable.retail"), t("priceTable.buylist")],
        rows: [
          {
            label: t("priceTable.regular"),
            values: [
              card.cardKingdomPrice
                ? card.cardKingdomPrice.retail
                : (card.priceCardKingdom ?? null),
              card.cardKingdomPrice?.buylist ?? null,
            ],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.cardKingdomPriceFoil
                ? card.cardKingdomPriceFoil.retail
                : (card.priceCardKingdomFoil ?? null),
              card.cardKingdomPriceFoil?.buylist ?? null,
            ],
          },
        ],
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
        <div className="flex max-w-full flex-col gap-3 rounded-lg bg-foreground/6 px-4 py-2 w-fit">
          {ordered.flatMap(({ source: key, table, extraTables = [] }) =>
            [table, ...extraTables].map((sourceTable) => (
              <PriceTable key={`${key}:${sourceTable.heading}`} {...sourceTable} />
            )),
          )}
        </div>
      )}
    </div>
  );
}
