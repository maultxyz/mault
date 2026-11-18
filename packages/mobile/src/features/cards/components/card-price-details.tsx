import { priceChangeSinceScan, tcgplayerHeadlinePrices, MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { formatEur, formatUsd } from "@/features/cards/lib/price-format";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { PRICE_TABLE_COLUMN_WIDTH } from "@/lib/constants/cards";
import { SPACING } from "@/lib/constants/theme";
import type { CardPriceDetailsProps, PriceSourceSection } from "@/lib/interfaces/cards";

export function CardPriceDetails({ card, isFoil, foilType, stamp, condition }: CardPriceDetailsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { source } = usePricing();
  const [open, setOpen] = useState(false);
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
        columns: [t("priceTable.low"), t("priceTable.trend"), t("priceTable.avg"), t("priceTable.avg7"), t("priceTable.avg30")],
        rows: [
          {
            label: t("priceTable.regular"),
            values: [
              card.cardmarketPrice?.low ?? null,
              card.cardmarketPrice?.trend ?? null,
              card.cardmarketPrice ? card.cardmarketPrice.avg : (card.priceEur ?? null),
              card.cardmarketPrice?.avg7 ?? null,
              card.cardmarketPrice?.avg30 ?? null,
            ],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.cardmarketPriceFoil?.low ?? null,
              card.cardmarketPriceFoil?.trend ?? null,
              card.cardmarketPriceFoil ? card.cardmarketPriceFoil.avg : (card.priceEurFoil ?? null),
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
              card.cardKingdomPrice ? card.cardKingdomPrice.retail : (card.priceCardKingdom ?? null),
              card.cardKingdomPrice?.buylist ?? null,
            ],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.cardKingdomPriceFoil ? card.cardKingdomPriceFoil.retail : (card.priceCardKingdomFoil ?? null),
              card.cardKingdomPriceFoil?.buylist ?? null,
            ],
          },
        ],
        highlightColumn: 0,
        format: formatUsd,
      },
    },
  ];

  const hasAnyPrice = sections.some(({ table }) => table.rows.some((row) => row.values.some((value) => value != null)));
  if (!hasAnyPrice) return null;
  const ordered = [...sections.filter((s) => s.source === source), ...sections.filter((s) => s.source !== source)];

  const headlineRows = ordered.filter(({ headline }) => headline.price != null || headline.foilPrice != null);
  const detailTables = ordered
    .map(({ source: key, table }) => {
      const finishColumns = table.rows
        .map((row, rowIndex) => ({ label: row.label, rowIndex }))
        .filter(({ rowIndex }) => table.rows[rowIndex].values.some((value) => value != null));
      const metricRows = table.columns
        .map((metric, metricIndex) => ({
          metric,
          metricIndex,
          values: finishColumns.map(({ rowIndex }) => table.rows[rowIndex].values[metricIndex] ?? null),
        }))
        .filter(({ values }) => values.some((value) => value != null));
      return { key, table, finishColumns, metricRows };
    })
    .filter(({ metricRows }) => metricRows.length > 0);

  return (
    <View style={{ gap: SPACING.md }}>
      <View>
        {headlineRows.map(({ source: key, headline }) => {
          const showFoil = isFoil && headline.foilPrice != null;
          const main = showFoil ? headline.foilPrice : headline.price;
          const secondary = showFoil ? headline.price : headline.foilPrice;
          const mainAtScan = showFoil ? headline.foilPriceAtScan : headline.priceAtScan;
          const changeSinceScan = priceChangeSinceScan(mainAtScan, main);
          return (
            <View
              key={key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING.md,
                paddingVertical: SPACING.sm,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <AppText size="sm" weight="medium">
                  {headline.label}
                </AppText>
                {secondary != null ? (
                  <AppText size="xs" tone="secondary">
                    {t(showFoil ? "priceTable.nonFoilPrice" : "priceTable.foilPrice", {
                      price: headline.format(secondary),
                    })}
                  </AppText>
                ) : null}
                {mainAtScan != null && changeSinceScan ? (
                  <AppText size="xs" tone="secondary">
                    {t("priceTable.priceAtScan", { price: headline.format(mainAtScan) })}{" "}
                    <AppText
                      size="xs"
                      weight="medium"
                      tone={changeSinceScan.direction === "up" ? "success" : "destructive"}
                    >
                      {changeSinceScan.percentLabel}
                    </AppText>
                  </AppText>
                ) : null}
              </View>
              <AppText
                size="lg"
                heading
                weight="bold"
                accessibilityLabel={main != null ? undefined : t("priceTable.noPrice")}
              >
                {main != null ? headline.format(main) : MISSING_PRICE_TEXT}
              </AppText>
            </View>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        hitSlop={SPACING.sm}
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, alignSelf: "flex-start", paddingVertical: SPACING.xs }}
      >
        <Icon name={open ? "expand" : "chevron"} size={14} color={colors.foregroundSecondary} />
        <AppText size="sm" weight="medium" tone="secondary">
          {open ? t("priceTable.hideDetails") : t("priceTable.showDetails")}
        </AppText>
      </Pressable>

      {open
        ? detailTables.map(({ key, table, finishColumns, metricRows }) => (
            <View key={key} style={{ gap: SPACING.xs }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm, paddingBottom: SPACING.xs }}>
                <AppText size="sm" weight="semibold" accessibilityRole="header" style={{ flex: 1, minWidth: 0 }}>
                  {table.heading}
                </AppText>
                {finishColumns.map(({ label }) => (
                  <AppText key={label} size="xs" tone="secondary" style={{ width: PRICE_TABLE_COLUMN_WIDTH, textAlign: "right" }}>
                    {label}
                  </AppText>
                ))}
              </View>
              {metricRows.map(({ metric, metricIndex, values }) => (
                <View
                  key={metric}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.sm,
                    paddingVertical: SPACING.xs,
                  }}
                >
                  <AppText size="sm" tone="secondary" style={{ flex: 1, minWidth: 0 }}>
                    {metric}
                  </AppText>
                  {values.map((value, valueIndex) => (
                    <AppText
                      key={finishColumns[valueIndex].label}
                      size="sm"
                      weight={metricIndex === table.highlightColumn ? "semibold" : "regular"}
                      style={{ width: PRICE_TABLE_COLUMN_WIDTH, textAlign: "right" }}
                      accessibilityLabel={value != null ? undefined : t("priceTable.noPrice")}
                    >
                      {value != null ? table.format(value) : MISSING_PRICE_TEXT}
                    </AppText>
                  ))}
                </View>
              ))}
            </View>
          ))
        : null}
    </View>
  );
}
