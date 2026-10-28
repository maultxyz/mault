import { priceChangeSinceScan } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { formatEur, formatUsd } from "@/features/cards/lib/price-format";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { PRICE_TABLE_COLUMN_WIDTH } from "@/lib/constants/cards";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardPriceDetailsProps, PriceSourceSection } from "@/lib/interfaces/cards";

export function CardPriceDetails({ card, isFoil, foilType }: CardPriceDetailsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { source } = usePricing();
  const [open, setOpen] = useState(false);

  const sections: PriceSourceSection[] = [
    {
      source: "tcgplayer",
      headline: {
        label: t("priceTable.tcgplayerMarket"),
        price: card.price,
        foilPrice:
          (foilType ? card.finishPrices?.[foilType]?.priceFoil : null) ??
          card.priceFoil,
        priceAtScan: card.pricesAtScan?.price,
        foilPriceAtScan: card.pricesAtScan?.priceFoil,
        format: formatUsd,
      },
      table: {
        heading: t("priceTable.heading"),
        columns: [t("priceTable.low"), t("priceTable.mid"), t("priceTable.market"), t("priceTable.high")],
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
        printings: Math.max(card.priceRange?.printings ?? 1, card.priceRangeFoil?.printings ?? 1),
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
        printings: Math.max(card.cardmarketPrice?.printings ?? 1, card.cardmarketPriceFoil?.printings ?? 1),
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
            values: [card.cardKingdomPrice?.retail ?? card.priceCardKingdom ?? null, card.cardKingdomPrice?.buylist ?? null],
          },
          {
            label: t("priceTable.foil"),
            values: [
              card.cardKingdomPriceFoil?.retail ?? card.priceCardKingdomFoil ?? null,
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

  const hasAnyPrice = sections.some(({ table }) => table.rows.some((row) => row.values.some((value) => value != null)));
  if (!hasAnyPrice) return null;
  const ordered = [...sections.filter((s) => s.source === source), ...sections.filter((s) => s.source !== source)];

  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {ordered.map(({ source: key, headline }) => {
          if (headline.price == null && headline.foilPrice == null) return null;
          const showFoil = isFoil && headline.foilPrice != null;
          const main = showFoil ? headline.foilPrice : headline.price;
          const secondary = showFoil ? headline.price : headline.foilPrice;
          const mainAtScan = showFoil ? headline.foilPriceAtScan : headline.priceAtScan;
          const changeSinceScan = priceChangeSinceScan(mainAtScan, main);
          return (
            <View
              key={key}
              style={{
                flexGrow: 1,
                flexBasis: "45%",
                gap: 2,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm + 2,
                borderRadius: RADIUS.lg,
                backgroundColor: colors.muted,
              }}
            >
              <AppText size="xs" tone="secondary" numberOfLines={1}>
                {headline.label}
              </AppText>
              <AppText size="base" heading weight="bold" style={{ fontVariant: ["tabular-nums"] }}>
                {main != null ? headline.format(main) : t("priceTable.noPrice")}
              </AppText>
              {secondary != null ? (
                <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
                  {t(showFoil ? "priceTable.nonFoilPrice" : "priceTable.foilPrice", {
                    price: headline.format(secondary),
                  })}
                </AppText>
              ) : null}
              {mainAtScan != null && changeSinceScan ? (
                <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
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

      {open ? (
        <View style={{ gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: colors.muted }}>
          {ordered.map(({ source: key, table }) => {
            const rows = table.rows.filter((row) => row.values.some((value) => value != null));
            if (rows.length === 0) return null;
            return (
              <View key={key} style={{ gap: SPACING.xs }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 6 }}>
                      <AppText size="xs" tone="secondary" style={{ width: PRICE_TABLE_COLUMN_WIDTH }}>
                        {table.heading}
                      </AppText>
                      {table.columns.map((column) => (
                        <AppText key={column} size="xs" tone="secondary" style={{ width: PRICE_TABLE_COLUMN_WIDTH, textAlign: "right" }}>
                          {column}
                        </AppText>
                      ))}
                    </View>
                    {rows.map((row) => (
                      <View
                        key={row.label}
                        style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}
                      >
                        <AppText size="xs" tone="secondary" style={{ width: PRICE_TABLE_COLUMN_WIDTH }}>
                          {row.label}
                        </AppText>
                        {row.values.map((value, index) => (
                          <AppText
                            key={table.columns[index]}
                            size="xs"
                            weight={index === table.highlightColumn ? "semibold" : "regular"}
                            style={{ width: PRICE_TABLE_COLUMN_WIDTH, textAlign: "right", fontVariant: ["tabular-nums"] }}
                          >
                            {value != null ? table.format(value) : t("priceTable.noPrice")}
                          </AppText>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
                {table.printings > 1 ? (
                  <AppText size="2xs" tone="secondary">
                    {t("priceTable.acrossPrintings", { count: table.printings })}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
