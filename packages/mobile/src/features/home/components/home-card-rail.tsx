import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { CardTile } from "@/components/cards/card-tile";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_CARD_RAIL_TILE_WIDTH } from "@/lib/constants/home";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { HomeCardRailProps } from "@/lib/interfaces/home";
import { cardArtSources } from "@/lib/card-art";

export function HomeCardRail({ title, cards, captionOf, tileWidth = HOME_CARD_RAIL_TILE_WIDTH, action }: HomeCardRailProps) {
  if (cards.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader
        title={title}
        action={action ? <Button variant="ghost" size="sm" label={action.label} onPress={action.onPress} /> : undefined}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SCREEN_GUTTER }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}
      >
        {cards.map((card) => (
          <View key={card.scanId} style={{ width: tileWidth }}>
            <CardTile
              name={card.card.name}
              caption={captionOf(card)}
              {...cardArtSources(card.card.image)}
              isFoil={card.isFoil}
              onPress={() =>
                router.push({ pathname: "/card/[scanId]", params: { scanId: card.scanId, guid: card.collectionGuid } })
              }
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
