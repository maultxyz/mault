import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardTileProps } from "@/lib/interfaces/ui";

export const CardTile = memo(function CardTile({
  name,
  caption,
  imageUrl,
  quantity,
  flagged = false,
  corrected = false,
  onPress,
}: CardTileProps) {
  const colors = useTheme();
  const awaitingReview = flagged && !corrected;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${name}, ${caption}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View
        style={{
          width: "100%",
          aspectRatio: CARD_ASPECT_RATIO,
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          backgroundColor: colors.muted,
          borderWidth: awaitingReview ? 2 : 1,
          borderColor: awaitingReview ? colors.warning : colors.cardRing,
        }}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="cover" transition={120} />
        ) : null}
        {flagged ? (
          <View
            style={{
              position: "absolute",
              top: SPACING.xs,
              left: SPACING.xs,
              padding: 2,
              borderRadius: RADIUS.full,
              backgroundColor: corrected ? colors.successStrong : colors.warningStrong,
            }}
          >
            <Icon name={corrected ? "check" : "help"} size={12} color="#ffffff" />
          </View>
        ) : null}
        {quantity && quantity > 1 ? (
          <View
            style={{
              position: "absolute",
              top: SPACING.xs,
              right: SPACING.xs,
              paddingHorizontal: SPACING.xs,
              borderRadius: RADIUS.sm,
              backgroundColor: colors.background,
              opacity: 0.92,
            }}
          >
            <AppText size="2xs" weight="semibold" style={{ lineHeight: 16 }}>
              {`×${quantity}`}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ minWidth: 0, paddingHorizontal: 2 }}>
        <AppText size="xs" weight="medium" numberOfLines={1}>
          {name}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
          {caption}
        </AppText>
      </View>
    </Pressable>
  );
});
