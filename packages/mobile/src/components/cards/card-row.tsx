import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { CheckboxIndicator } from "@/components/ui/checkbox-indicator";
import { Pill } from "@/components/ui/pill";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { CardRowProps } from "@/lib/interfaces/ui";

export function CardRow({
  name,
  subtitle,
  imageUrl,
  placeholderUrl,
  quantity,
  price,
  binNumber,
  lowConfidence,
  checked,
  onPress,
  onPressIn,
}: CardRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole={checked !== undefined ? "checkbox" : onPress ? "button" : undefined}
      accessibilityState={checked !== undefined ? { checked } : undefined}
      accessibilityLabel={[
        name,
        subtitle,
        price,
        quantity && quantity > 1 ? t("cards.quantity", { count: quantity }) : null,
        binNumber != null ? t("cards.bin", { number: binNumber }) : null,
        lowConfidence ? t("cards.needsReview") : null,
      ]
        .filter(Boolean)
        .join(", ")}
      disabled={!onPress}
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        minHeight: LIST_ROW_MIN_HEIGHT,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SCREEN_GUTTER,
        backgroundColor: pressed ? colors.tonal : "transparent",
        opacity: checked ? 0.6 : 1,
      })}
    >
      {checked !== undefined ? <CheckboxIndicator checked={checked} /> : null}
      <CardThumbnail imageUrl={imageUrl} placeholderUrl={placeholderUrl} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText weight="medium" numberOfLines={1}>
          {name}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
        {binNumber != null || lowConfidence ? (
          <View style={{ flexDirection: "row", gap: SPACING.xs, marginTop: 2 }}>
            {binNumber != null ? <Pill label={t("cards.bin", { number: binNumber })} /> : null}
            {lowConfidence ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {price ? (
          <AppText weight="medium">
            {price}
          </AppText>
        ) : null}
        {quantity && quantity > 1 ? (
          <AppText size="xs" tone="secondary">
            {t("cards.quantity", { count: quantity })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
