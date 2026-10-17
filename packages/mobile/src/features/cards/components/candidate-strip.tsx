import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { CANDIDATE_THUMB_WIDTH } from "@/lib/constants/cards";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CandidateStripProps } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";

export function CandidateStrip({ candidates, selectedId, onSelect, disabled = false }: CandidateStripProps) {
  const colors = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -SCREEN_GUTTER }}
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}
    >
      {candidates.map((candidate) => {
        const selected = candidate.id === selectedId;
        return (
          <Pressable
            key={candidate.id}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={`${candidate.name}, ${candidate.set.toUpperCase()} #${candidate.collectorNumber}`}
            disabled={disabled}
            onPress={() => onSelect(candidate)}
            style={({ pressed }) => ({ width: CANDIDATE_THUMB_WIDTH, gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <View
              style={{
                width: "100%",
                aspectRatio: CARD_ASPECT_RATIO,
                borderRadius: RADIUS.md,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: colors.muted,
              }}
            >
              <Image
                source={absoluteUrl(candidate.image?.small ?? candidate.image?.normal)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </View>
            <AppText
              size="xs"
              weight={selected ? "semibold" : "medium"}
              numberOfLines={1}
              style={{ textAlign: "center", color: selected ? colors.primaryText : colors.foregroundSecondary }}
            >
              {`${candidate.set.toUpperCase()} #${candidate.collectorNumber}`}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
