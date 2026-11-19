import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { CardTile } from "@/components/cards/card-tile";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import {
  HOME_CARD_RAIL_LOADING_TILE_COUNT,
  HOME_CARD_RAIL_SKELETON_LINE_HEIGHT,
  HOME_CARD_RAIL_TILE_WIDTH,
} from "@/lib/constants/home";
import { CARD_ART_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { HomeCardRailProps } from "@/lib/interfaces/home";
import { cardArtSources } from "@/lib/card-art";
import { usePrefetchCollectionCard } from "@/hooks/use-prefetch-collection-card";

export function HomeCardRail({
  title,
  cards,
  captionOf,
  priceChangeOf,
  tileWidth = HOME_CARD_RAIL_TILE_WIDTH,
  action,
  isLoading = false,
  loadingTileCount = HOME_CARD_RAIL_LOADING_TILE_COUNT,
}: HomeCardRailProps) {
  const prefetchCollectionCard = usePrefetchCollectionCard();
  if (!isLoading && cards.length === 0) return null;
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
        {isLoading
          ? Array.from({ length: loadingTileCount }).map((_, index) => (
              <View key={index} style={{ width: tileWidth, gap: SPACING.xs + 2 }}>
                <Skeleton width={tileWidth} height={tileWidth / CARD_ASPECT_RATIO} radius={CARD_ART_RADIUS} />
                <Skeleton width="80%" height={HOME_CARD_RAIL_SKELETON_LINE_HEIGHT} />
                <Skeleton width="55%" height={HOME_CARD_RAIL_SKELETON_LINE_HEIGHT} />
              </View>
            ))
          : cards.map((card) => {
          const priceChange = priceChangeOf?.(card) ?? null;
          return (
          <View key={card.scanId} style={{ width: tileWidth }}>
            <CardTile
              name={card.card.name}
              caption={captionOf(card)}
              captionHighlight={
                priceChange
                  ? { text: priceChange.change, tone: priceChange.direction === "up" ? "success" : "destructive" }
                  : null
              }
              {...cardArtSources(card.card.image)}
              isFoil={card.isFoil}
              onPress={() =>
                router.push({ pathname: "/card/[scanId]", params: { scanId: card.scanId, guid: card.collectionGuid } })
              }
              onPressIn={() => prefetchCollectionCard(card.collectionGuid, card.scanId)}
            />
          </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
