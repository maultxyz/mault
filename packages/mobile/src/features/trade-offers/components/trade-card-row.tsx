import { Pressable, View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { TRADE_CARD_THUMBNAIL_WIDTH } from "@/lib/constants/trade";
import { CARD_THUMBNAIL_RADIUS, SPACING } from "@/lib/constants/theme";
import type { TradeCardRowProps } from "@/lib/interfaces/trade";

export function TradeCardRow({
  name,
  subtitle,
  imageUrl,
  onPress,
  accessibilityHint,
  selected,
  right,
}: TradeCardRowProps) {
  const colors = useTheme();
  const content = (
    <>
      <CardArt
        imageUrl={imageUrl}
        accessible={false}
        style={{
          width: TRADE_CARD_THUMBNAIL_WIDTH,
          aspectRatio: 2.5 / 3.5,
          borderRadius: CARD_THUMBNAIL_RADIUS,
          backgroundColor: colors.muted,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="sm" weight="medium" numberOfLines={2}>
          {name}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </>
  );
  const rowStyle = { flexDirection: "row" as const, alignItems: "center" as const, gap: SPACING.sm, paddingVertical: SPACING.xs };
  return (
    <View style={rowStyle}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${subtitle}`}
          accessibilityHint={accessibilityHint}
          accessibilityState={selected === undefined ? undefined : { selected }}
          onPress={onPress}
          style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm }, pressed && { opacity: 0.6 }]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>{content}</View>
      )}
      {right}
    </View>
  );
}
