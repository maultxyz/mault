import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
import { useTheme } from "@/hooks/use-theme";
import { CARD_THUMB_HEIGHT, CARD_THUMB_WIDTH } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardRowProps } from "@/lib/interfaces/ui";

export function CardRow({ name, subtitle, imageUrl, quantity, price, binNumber, lowConfidence, onPress }: CardRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[name, subtitle, price].filter(Boolean).join(", ")}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: CARD_THUMB_WIDTH, height: CARD_THUMB_HEIGHT, borderRadius: RADIUS.sm }}
          contentFit="cover"
          transition={0}
        />
      ) : (
        <View
          style={{
            width: CARD_THUMB_WIDTH,
            height: CARD_THUMB_HEIGHT,
            borderRadius: RADIUS.sm,
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
