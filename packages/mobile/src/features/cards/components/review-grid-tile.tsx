import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { scanImageQueryOptions } from "@/features/collections/api/collection-cards";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { ReviewGridTileProps } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";

export function ReviewGridTile({ card, accepting, onAccept, onCorrect }: ReviewGridTileProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const image = useQuery(scanImageQueryOptions(card.collectionGuid, card.scanId));
  const capturedUrl = absoluteUrl(image.data);
  const matchedUrl = absoluteUrl(card.card.image?.normal ?? card.card.image?.small);
  const imageFrame = {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: RADIUS.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  };

  return (
    <Surface padded={false} style={{ padding: SPACING.md, gap: SPACING.md }}>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <View style={{ flex: 1, gap: SPACING.xs }}>
          <AppText size="2xs" tone="secondary">
            {t("cardDetail.capturedScan")}
          </AppText>
          <View style={imageFrame}>
            {capturedUrl ? (
              <Image source={{ uri: capturedUrl }} style={{ flex: 1 }} contentFit="fill" />
            ) : image.isPending ? (
              <Skeleton height="100%" radius={0} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.xs, padding: SPACING.sm }}>
                <Icon name="photoOff" size={18} color={colors.mutedForeground} />
                <AppText size="2xs" tone="secondary" style={{ textAlign: "center" }}>
                  {t("reviewGrid.noPhoto")}
                </AppText>
              </View>
            )}
          </View>
        </View>
        <View style={{ flex: 1, gap: SPACING.xs }}>
          <AppText size="2xs" tone="secondary">
            {t("cardDetail.matchedCard")}
          </AppText>
          <View style={imageFrame}>
            {matchedUrl ? (
              <Image source={{ uri: matchedUrl }} style={{ flex: 1 }} contentFit="cover" transition={120} />
            ) : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="medium" numberOfLines={1}>
            {card.card.name}
          </AppText>
          <AppText size="xs" tone="secondary" numberOfLines={1}>
            {`${card.card.set.toUpperCase()} #${card.card.collectorNumber}`}
          </AppText>
        </View>
        {card.lowConfidenceMatch || card.hasAlternatives ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
      </View>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon="edit"
          label={t("reviewGrid.correct")}
          onPress={onCorrect}
        />
        <Button style={{ flex: 1 }} icon="check" label={t("reviewGrid.accept")} loading={accepting} onPress={onAccept} />
      </View>
    </Surface>
  );
}
