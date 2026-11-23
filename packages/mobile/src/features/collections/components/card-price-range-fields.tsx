import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { DecimalTextField } from "@/components/ui/decimal-text-field";
import { SPACING } from "@/lib/constants/theme";
import type { CardPriceRangeFieldsProps } from "@/lib/interfaces/collections";

export function CardPriceRangeFields({ minPrice, maxPrice, onChange }: CardPriceRangeFieldsProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ minPrice, maxPrice });
  const [syncedRange, setSyncedRange] = useState({ minPrice, maxPrice });

  if (syncedRange.minPrice !== minPrice || syncedRange.maxPrice !== maxPrice) {
    setSyncedRange({ minPrice, maxPrice });
    setDraft({ minPrice, maxPrice });
  }

  const commit = () => {
    if (draft.minPrice !== minPrice || draft.maxPrice !== maxPrice) onChange(draft);
  };

  return (
    <View style={{ flexDirection: "row", gap: SPACING.sm }}>
      <View style={{ flex: 1 }}>
        <DecimalTextField
          label={t("collection.filters.minPrice")}
          value={draft.minPrice}
          onChange={(value) => setDraft((current) => ({ ...current, minPrice: value }))}
          onBlur={commit}
        />
      </View>
      <View style={{ flex: 1 }}>
        <DecimalTextField
          label={t("collection.filters.maxPrice")}
          value={draft.maxPrice}
          onChange={(value) => setDraft((current) => ({ ...current, maxPrice: value }))}
          onBlur={commit}
        />
      </View>
    </View>
  );
}
