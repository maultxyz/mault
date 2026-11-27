import { TRADE_OFFER_CARD_QUANTITY_MAX } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { TradeQuantityStepper } from "@/features/trade-offers/components/trade-quantity-stepper";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET } from "@/lib/constants/ui";
import type { OfferedTradeCardRowProps } from "@/lib/interfaces/trade";

export function OfferedTradeCardRow({
  card,
  value,
  valueAccessibilityLabel,
  onQuantityChange,
  onEditDetails,
  onRemove,
}: OfferedTradeCardRowProps) {
  const { t } = useTranslation();
  const finishLabel = [t(`trade.conditions.${card.condition}`), card.isFoil ? t("trade.foil") : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <View>
      <TradeCardRow
        name={card.name}
        subtitle={card.setName || card.setCode.toUpperCase()}
        imageUrl={card.imageUrl}
        value={value}
        valueAccessibilityLabel={valueAccessibilityLabel}
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: SPACING.sm,
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: SPACING.sm,
        }}
      >
        <TradeQuantityStepper
          cardName={card.name}
          quantity={card.quantity}
          maxQuantity={TRADE_OFFER_CARD_QUANTITY_MAX}
          onChange={onQuantityChange}
        />
        <View style={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
          <Button
            variant="ghost"
            icon="edit"
            label={finishLabel}
            accessibilityLabel={t("trade.editFinishOf", { name: card.name, finish: finishLabel })}
            accessibilityHint={t("trade.editFinishHint")}
            onPress={onEditDetails}
          />
        </View>
        <IconButton
          icon="trash"
          variant="plain"
          size={MIN_TOUCH_TARGET}
          accessibilityLabel={t("trade.removeCard", { name: card.name })}
          onPress={onRemove}
        />
      </View>
    </View>
  );
}
