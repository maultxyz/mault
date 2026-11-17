import { ScrollView, View } from "react-native";
import { CardTile } from "@/components/cards/card-tile";
import { usePricing } from "@/hooks/use-pricing";
import { CANDIDATE_THUMB_WIDTH } from "@/lib/constants/cards";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CandidateStripProps } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";

export function CandidateStrip({ candidates, selectedId, onSelect, disabled = false }: CandidateStripProps) {
  const pricing = usePricing();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -SCREEN_GUTTER }}
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}
    >
      {candidates.map((candidate) => {
        const price = pricing.priceOf(candidate, false);
        const printing = `${candidate.set.toUpperCase()} #${candidate.collectorNumber}`;
        return (
          <View key={candidate.id} style={{ width: CANDIDATE_THUMB_WIDTH, flexDirection: "row" }}>
            <CardTile
              name={candidate.name}
              caption={price != null ? `${printing} · ${pricing.format(price)}` : printing}
              imageUrl={absoluteUrl(candidate.image?.normal ?? candidate.image?.small)}
              selected={candidate.id === selectedId}
              disabled={disabled}
              onPress={() => onSelect(candidate)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}
