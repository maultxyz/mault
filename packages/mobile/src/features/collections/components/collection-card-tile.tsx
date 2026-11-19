import { memo } from "react";
import { View } from "react-native";
import { CardTile } from "@/components/cards/card-tile";
import { cardArtSources } from "@/lib/card-art";
import type { CollectionCardTileProps } from "@/lib/interfaces/collections";

export const CollectionCardTile = memo(function CollectionCardTile({
  item,
  width,
  pricing,
  onOpen,
  onPrefetch,
  onShowActions,
}: CollectionCardTileProps) {
  const price = pricing.priceOf(item.card, { isFoil: item.isFoil, foilType: item.foilType }, item.condition);
  const flagged = !!item.lowConfidenceMatch || !!item.alternativeMatches?.length;
  return (
    <View style={{ width }}>
      <CardTile
        name={item.card.name}
        caption={price != null ? pricing.format(price) : `${item.card.set.toUpperCase()} #${item.card.collectorNumber}`}
        {...cardArtSources(item.card.image)}
        quantity={item.quantity}
        flagged={flagged}
        corrected={!!item.corrected || !!item.reviewed}
        onPress={() => onOpen(item.scanId)}
        onPressIn={() => onPrefetch(item.scanId)}
        onLongPress={() => onShowActions(item)}
      />
    </View>
  );
});
