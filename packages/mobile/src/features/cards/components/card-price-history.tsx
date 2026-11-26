import {
  cardPriceHistorySeries,
  CARD_PRICE_HISTORY_SHOWN_DAYS,
  PRICE_SOURCE_FIELDS,
  PRICE_SOURCE_STORE_NAME_KEYS,
  utcDayOf,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cardPriceHistoryQueryOptions } from "@/features/cards/api/card-price-history";
import { formatPriceHistoryDay } from "@/features/cards/lib/price-history-day";
import { PriceHistorySparkline } from "@/features/cards/components/price-history-sparkline";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_PRICE_HISTORY_SPARKLINE } from "@/lib/constants/cards";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardPriceHistoryProps } from "@/lib/interfaces/cards";

export function CardPriceHistory({ card, gameKey, lang, isFoil }: CardPriceHistoryProps) {
  const { t, i18n } = useTranslation();
  const { source, format } = usePricing();
  const colors = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fields = PRICE_SOURCE_FIELDS[source];
  const hasCurrentPrice = card[fields.price] != null || card[fields.priceFoil] != null;
  const history = useQuery({
    ...cardPriceHistoryQueryOptions({ gameKey, lang, cardId: card.id }),
    enabled: hasCurrentPrice,
  });
  if (!hasCurrentPrice) return null;

  const series = cardPriceHistorySeries(history.data?.points ?? [], {
    source,
    isFoil,
    rangeDays: CARD_PRICE_HISTORY_SHOWN_DAYS,
    today: utcDayOf(new Date()),
  });
  const lastIndex = series.days.length - 1;
  const shownIndex = Math.min(selectedIndex ?? lastIndex, lastIndex);
  const shownDay = series.days[shownIndex];
  const shownDayLabel = shownDay ? formatPriceHistoryDay(shownDay.day, i18n.language) : "";
  const title = t(series.isFoilPrice ? "priceHistory.titleFoil" : "priceHistory.title", {
    source: t(PRICE_SOURCE_STORE_NAME_KEYS[source]),
  });

  return (
    <View style={{ gap: SPACING.md }}>
      <AppText size="sm" weight="medium" accessibilityRole="header">
        {title}
      </AppText>
      {history.isPending ? (
        <View
          accessible
          accessibilityLabel={t("common.loading")}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md }}
        >
          <View style={{ gap: SPACING.xs }}>
            <Skeleton width={64} height={12} />
            <Skeleton width={84} height={22} />
          </View>
          <Skeleton
            width={CARD_PRICE_HISTORY_SPARKLINE.width + SPACING.sm * 2}
            height={CARD_PRICE_HISTORY_SPARKLINE.height + SPACING.sm * 2}
          />
        </View>
      ) : history.isError ? (
        <View style={{ gap: SPACING.sm, alignItems: "flex-start" }}>
          <AppText size="xs" tone="secondary" accessibilityRole="alert">
            {t("priceHistory.loadFailed")}
          </AppText>
          <Button
            variant="secondary"
            icon="refresh"
            label={t("recovery.retry")}
            loading={history.isRefetching}
            onPress={() => void history.refetch()}
          />
        </View>
      ) : !shownDay ? (
        <AppText size="xs" tone="secondary">
          {t("priceHistory.empty")}
        </AppText>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md }}>
          <View style={{ flexShrink: 1 }}>
            <AppText size="xs" tone="secondary">
              {shownDayLabel}
            </AppText>
            <AppText size="lg" weight="semibold">
              {format(shownDay.value)}
            </AppText>
          </View>
          {series.days.length < 2 ? (
            <AppText size="xs" tone="secondary" style={{ flexShrink: 1, maxWidth: CARD_PRICE_HISTORY_SPARKLINE.width }}>
              {t("priceHistory.unchangedSince", {
                date: formatPriceHistoryDay(series.currentPriceSinceDay ?? shownDay.day, i18n.language),
              })}
            </AppText>
          ) : (
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                padding: SPACING.sm,
                borderRadius: RADIUS.md,
                backgroundColor: colors.muted,
              }}
            >
              <PriceHistorySparkline
                values={series.days.map((day) => day.value)}
                selectedIndex={shownIndex}
                onSelectedIndexChange={setSelectedIndex}
                accessibilityLabel={title}
                accessibilityValueText={`${shownDayLabel}: ${format(shownDay.value)}`}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
