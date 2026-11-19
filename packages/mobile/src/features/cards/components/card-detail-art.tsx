import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
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
  const { t } = useTranslation();
  const [backSideCardId, setBackSideCardId] = useState<string | null>(null);
  const backImage = card?.backImage ?? null;
  const showsBackSide = !!backImage && !!card && backSideCardId === card.id;

  return (
    <View style={{ flex: 1, gap: 6 }}>
      {caption || (backImage && card) ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          {caption ? (
            <AppText size="xs" tone="secondary">
              {caption}
            </AppText>
          ) : (
            <View />
          )}
          {backImage && card ? (
            <IconButton
              icon="switchSides"
              variant="plain"
              size={32}
              selected={showsBackSide}
              accessibilityLabel={showsBackSide ? t("cardDetail.showFrontSide") : t("cardDetail.showBackSide")}
              onPress={() => setBackSideCardId(showsBackSide ? null : card.id)}
            />
          ) : null}
        </View>
      ) : null}
      <CardImageFrame>
        {card ? (
          <CardArt
            key={showsBackSide ? "back" : "front"}
            {...cardArtSources(showsBackSide ? backImage : card.image)}
            accessibilityLabel={showsBackSide ? t("cardDetail.backSideAlt", { name: card.name }) : card.name}
            style={{ flex: 1 }}
            contentFit="cover"
          />
        ) : null}
      </CardImageFrame>
    </View>
  );
}
