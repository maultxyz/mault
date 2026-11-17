import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SectionHeader } from "@/components/ui/section-header";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO, HOME_STRIP_CARD_WIDTH } from "@/lib/constants/collections";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CardStripProps } from "@/lib/interfaces/ui";
import { absoluteUrl } from "@/lib/url";

export function CardStrip({ title, cards, onOpen }: CardStripProps) {
  const colors = useTheme();
  const pricing = usePricing();
  if (cards.length === 0) return null;

  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SCREEN_GUTTER }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.xs, gap: SPACING.md }}
      >
        {cards.map((entry) => {
          const imageUrl = absoluteUrl(entry.card.image?.normal ?? entry.card.image?.small);
          return (
            <Pressable
              key={entry.scanId}
              accessibilityRole="button"
              accessibilityLabel={entry.card.name}
              onPress={() => onOpen(entry)}
              style={({ pressed }) => ({ width: HOME_STRIP_CARD_WIDTH, gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View
                style={{
                  width: "100%",
                  aspectRatio: CARD_ASPECT_RATIO,
                  borderRadius: RADIUS.lg,
                  overflow: "hidden",
                  backgroundColor: colors.muted,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="cover" transition={120} />
                ) : null}
              </View>
              <View style={{ minWidth: 0 }}>
                <AppText size="xs" weight="medium" numberOfLines={1}>
                  {entry.card.name}
                </AppText>
                <AppText size="xs" tone="secondary" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
                  {entry.price != null ? pricing.format(entry.price) : entry.collectionName}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
