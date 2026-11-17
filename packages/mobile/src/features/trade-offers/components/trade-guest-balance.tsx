import { formatPrice } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Surface } from "@/components/ui/surface";
import { SPACING } from "@/lib/constants/theme";
import type { TradeGuestBalanceProps } from "@/lib/interfaces/trade";

export function TradeGuestBalance({ balance, priceSource, isUpdating }: TradeGuestBalanceProps) {
  const { t } = useTranslation();
  const format = (value: number) => formatPrice(value, priceSource);
  const differenceText =
    balance.difference > 0
      ? t("trade.balance.youGiveMore", { amount: format(balance.difference) })
      : balance.difference < 0
        ? t("trade.balance.youGetMore", { amount: format(-balance.difference) })
        : t("trade.balance.even");

  return (
    <Surface style={{ gap: SPACING.sm, opacity: isUpdating ? 0.6 : 1 }}>
      <View
        accessible
        accessibilityState={{ busy: isUpdating }}
        accessibilityLabel={[
          `${t("trade.balance.youGet")} ${format(balance.getValue)}`,
          `${t("trade.balance.youGive")} ${format(balance.giveValue)}`,
          differenceText,
        ].join(", ")}
        style={{ flexDirection: "row", gap: SPACING.md }}
      >
        <View style={{ flex: 1 }}>
          <AppText size="xs" tone="secondary">
            {t("trade.balance.youGet")}
          </AppText>
          <AppText size="lg" weight="semibold">
            {format(balance.getValue)}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText size="xs" tone="secondary">
            {t("trade.balance.youGive")}
          </AppText>
          <AppText size="lg" weight="semibold">
            {format(balance.giveValue)}
          </AppText>
        </View>
      </View>
      <AppText size="sm" weight="medium">
        {differenceText}
      </AppText>
      {balance.hasMissingPrices ? (
        <AppText size="xs" tone="secondary">
          {t("trade.balance.missingPrices")}
        </AppText>
      ) : null}
    </Surface>
  );
}
