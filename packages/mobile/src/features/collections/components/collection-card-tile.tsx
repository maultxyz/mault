import { memo } from "react";
import { cardReviewStatus } from "@magic-vault/shared";
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
  isSelecting = false,
  isSelected = false,
  onToggleSelected,
}: CollectionCardTileProps) {
  const price = pricing.priceOf(item.card, { isFoil: item.isFoil, foilType: item.foilType }, item.condition);
  const reviewStatus = cardReviewStatus({
    hasAlternatives: !!item.alternativeMatches?.length,
    lowConfidenceMatch: !!item.lowConfidenceMatch,
    wasCorrected: !!item.corrected,
    isReviewed: !!item.reviewed,
  });
  return (
    <View style={{ width }}>
      <CardTile
        name={item.card.name}
        caption={price != null ? pricing.format(price) : `${item.card.set.toUpperCase()} #${item.card.collectorNumber}`}
        {...cardArtSources(item.card.image)}
        quantity={item.quantity}
        reviewStatus={reviewStatus}
        selected={isSelected}
        onPress={() => (isSelecting ? onToggleSelected?.(item) : onOpen(item.scanId))}
        onPressIn={isSelecting ? undefined : () => onPrefetch(item.scanId)}
        onLongPress={isSelecting ? undefined : () => onShowActions(item)}
      />
    </View>
  );
});
