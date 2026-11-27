import { CARD_CONDITIONS, isCardCondition } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { OptionSheet } from "@/components/ui/option-sheet";
import { OFFERED_TRADE_CARD_FOIL_OPTION } from "@/lib/constants/trade";
import type { OfferedTradeCardDetailsSheetProps } from "@/lib/interfaces/trade";

export function OfferedTradeCardDetailsSheet({
  card,
  onToggleFoil,
  onConditionChange,
  onClose,
}: OfferedTradeCardDetailsSheetProps) {
  const { t } = useTranslation();
  return (
    <OptionSheet
      visible={!!card}
      title={card?.name ?? ""}
      description={t("trade.editFinishDescription")}
      options={[
        { value: OFFERED_TRADE_CARD_FOIL_OPTION, label: t("trade.foil") },
        ...CARD_CONDITIONS.map((condition) => ({
          value: condition,
          label: t("trade.conditionOption", { condition: t(`trade.conditions.${condition}`) }),
        })),
      ]}
      selected={card ? [card.condition, ...(card.isFoil ? [OFFERED_TRADE_CARD_FOIL_OPTION] : [])] : []}
      onSelect={(value) => {
        if (!card) return;
        if (value === OFFERED_TRADE_CARD_FOIL_OPTION) onToggleFoil(card);
        else if (isCardCondition(value)) onConditionChange(card, value);
      }}
      onClose={onClose}
    />
  );
}
