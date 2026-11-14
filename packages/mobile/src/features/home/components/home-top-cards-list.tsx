import { router } from "expo-router";
import { View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { useTheme } from "@/hooks/use-theme";
import { cardArtSources } from "@/lib/card-art";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_THUMBNAIL_RADIUS, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import type { HomeTopCardsListProps } from "@/lib/interfaces/home";
import { absoluteUrl } from "@/lib/url";

export function HomeTopCardsList({ title, cards, priceOf, action }: HomeTopCardsListProps) {
  const colors = useTheme();
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
              leading={
                <View
                  style={{
                    width: LIST_ROW_ICON_SIZE,
                    aspectRatio: CARD_ASPECT_RATIO,
                    borderRadius: CARD_THUMBNAIL_RADIUS,
                    overflow: "hidden",
                    backgroundColor: colors.muted,
                  }}
                >
                  <CardArt {...sources} accessible={false} style={{ flex: 1 }} contentFit="cover" />
                </View>
              }
              onPress={() =>
                router.push({ pathname: "/card/[scanId]", params: { scanId: card.scanId, guid: card.collectionGuid } })
              }
            />
          );
        })}
      </ListGroup>
    </View>
  );
}
