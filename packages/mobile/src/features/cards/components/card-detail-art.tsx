import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { CardImageViewer } from "@/components/cards/card-image-viewer";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/hooks/use-theme";
import { cardArtSources } from "@/lib/card-art";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS } from "@/lib/constants/theme";
import type { CardDetailArtProps, CardImageFrameProps } from "@/lib/interfaces/cards";

export function CardImageFrame({ children, onPress, accessibilityLabel }: CardImageFrameProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const frameStyle = {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: CARD_ART_RADIUS,
    overflow: "hidden" as const,
    backgroundColor: colors.muted,
  };
  if (!onPress) return <View style={frameStyle}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("cardImageViewer.openHint")}
      onPress={onPress}
      style={({ pressed }) => [frameStyle, { opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

export function CardDetailArt({ card, caption }: CardDetailArtProps) {
  const { t } = useTranslation();
  const [backSideCardId, setBackSideCardId] = useState<string | null>(null);
  const backImage = card?.backImage ?? null;
  const showsBackSide = !!backImage && !!card && backSideCardId === card.id;
  const [viewerOpen, setViewerOpen] = useState(false);
  const shownSources = cardArtSources(showsBackSide ? backImage : card?.image);
  const shownLabel = card ? (showsBackSide ? t("cardDetail.backSideAlt", { name: card.name }) : card.name) : "";

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
      <CardImageFrame
        onPress={shownSources.imageUrl ? () => setViewerOpen(true) : undefined}
        accessibilityLabel={shownLabel}
      >
        {card ? (
          <CardArt
            key={showsBackSide ? "back" : "front"}
            {...shownSources}
            accessible={false}
            style={{ flex: 1 }}
            contentFit="cover"
          />
        ) : null}
      </CardImageFrame>
      <CardImageViewer
        visible={viewerOpen}
        imageUrl={shownSources.imageUrl}
        placeholderUrl={shownSources.placeholderUrl}
        accessibilityLabel={shownLabel}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}
