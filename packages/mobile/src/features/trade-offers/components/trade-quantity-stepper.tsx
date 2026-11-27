import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SPACING } from "@/lib/constants/theme";
import { TRADE_QUANTITY_VALUE_MIN_WIDTH } from "@/lib/constants/trade";
import type { TradeQuantityStepperProps } from "@/lib/interfaces/trade";

export function TradeQuantityStepper({ cardName, quantity, maxQuantity, onChange }: TradeQuantityStepperProps) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
      <Button
        variant="secondary"
        label="-"
        accessibilityLabel={t("trade.quantityDecreaseFor", { name: cardName })}
        disabled={quantity <= 1}
        onPress={() => onChange(Math.max(quantity - 1, 1))}
      />
      <AppText
        weight="semibold"
        accessibilityLiveRegion="polite"
        accessibilityLabel={t("trade.quantityOf", { count: quantity, name: cardName })}
        style={{ minWidth: TRADE_QUANTITY_VALUE_MIN_WIDTH, textAlign: "center" }}
      >
        {String(quantity)}
      </AppText>
      <Button
        variant="secondary"
        label="+"
        accessibilityLabel={t("trade.quantityIncreaseFor", { name: cardName })}
        disabled={quantity >= maxQuantity}
        onPress={() => onChange(Math.min(quantity + 1, maxQuantity))}
      />
    </View>
  );
}
