import { View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { cardArtSources } from "@/lib/card-art";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS } from "@/lib/constants/theme";
import type { CardDetailArtProps, CardImageFrameProps } from "@/lib/interfaces/cards";

export function CardImageFrame({ children }: CardImageFrameProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        aspectRatio: CARD_ASPECT_RATIO,
        borderRadius: CARD_ART_RADIUS,
        overflow: "hidden",
        backgroundColor: colors.muted,
      }}
    >
      {children}
    </View>
  );
}

export function CardDetailArt({ card, caption }: CardDetailArtProps) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      {caption ? (
        <AppText size="xs" tone="secondary">
          {caption}
        </AppText>
      ) : null}
      <CardImageFrame>
        {card ? (
          <CardArt {...cardArtSources(card.image)} accessibilityLabel={card.name} style={{ flex: 1 }} contentFit="cover" />
        ) : null}
      </CardImageFrame>
    </View>
  );
}
