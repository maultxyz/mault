import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { useTheme } from "@/hooks/use-theme";
import { CARD_THUMB_HEIGHT, CARD_THUMB_WIDTH } from "@/lib/constants/collections";
import { CARD_THUMBNAIL_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardRowProps } from "@/lib/interfaces/ui";

export function CardRow({
  name,
  subtitle,
  imageUrl,
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
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: pressed ? colors.muted : "transparent",
        opacity: checked ? 0.6 : 1,
      })}
    >
      {checked !== undefined ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: CARD_THUMBNAIL_RADIUS,
            borderWidth: 1,
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked ? <Icon name="check" size={14} color={colors.primaryForeground} /> : null}
        </View>
      ) : null}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: CARD_THUMB_WIDTH, height: CARD_THUMB_HEIGHT, borderRadius: CARD_THUMBNAIL_RADIUS }}
          contentFit="cover"
          transition={0}
        />
      ) : (
        <View
          style={{
            width: CARD_THUMB_WIDTH,
            height: CARD_THUMB_HEIGHT,
            borderRadius: CARD_THUMBNAIL_RADIUS,
            backgroundColor: colors.muted,
          }}
        />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium" numberOfLines={1}>
          {name}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
        <View style={{ flexDirection: "row", gap: SPACING.xs, marginTop: 2 }}>
          {binNumber != null ? <Pill label={t("cards.bin", { number: binNumber })} /> : null}
          {lowConfidence ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {price ? (
          <AppText weight="medium" style={{ fontVariant: ["tabular-nums"] }}>
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
