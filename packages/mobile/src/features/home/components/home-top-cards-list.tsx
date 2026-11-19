import { router } from "expo-router";
import { View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { cardArtSources } from "@/lib/card-art";
import { usePrefetchCollectionCard } from "@/hooks/use-prefetch-collection-card";
import { SPACING } from "@/lib/constants/theme";
import type { HomeTopCardsListProps } from "@/lib/interfaces/home";
import { absoluteUrl } from "@/lib/url";

export function HomeTopCardsList({ title, cards, priceOf, action }: HomeTopCardsListProps) {
  const prefetchCollectionCard = usePrefetchCollectionCard();
  if (cards.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader
        title={title}
        action={action ? <Button variant="ghost" size="sm" label={action.label} onPress={action.onPress} /> : undefined}
      />
      <ListGroup>
        {cards.map((card) => {
          const sources = cardArtSources({
            small: absoluteUrl(card.card.image?.small),
            normal: absoluteUrl(card.card.image?.normal),
          });
          return (
            <ListRow
              key={card.scanId}
              title={card.card.name}
              subtitle={card.collectionName}
              value={priceOf(card)}
              leading={<CardThumbnail {...sources} />}
              onPress={() =>
                router.push({ pathname: "/card/[scanId]", params: { scanId: card.scanId, guid: card.collectionGuid } })
              }
              onPressIn={() => prefetchCollectionCard(card.collectionGuid, card.scanId)}
            />
          );
        })}
      </ListGroup>
    </View>
  );
}
