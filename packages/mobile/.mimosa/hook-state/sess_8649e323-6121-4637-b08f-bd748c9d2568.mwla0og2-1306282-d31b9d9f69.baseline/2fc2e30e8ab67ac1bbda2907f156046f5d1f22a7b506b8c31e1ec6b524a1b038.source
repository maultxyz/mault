import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Surface } from "@/components/ui/surface";
import {
  pickWalkOrderLabel,
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import { cardArtSources } from "@/lib/card-art";
import { PICK_WALK_NEXT_CARD_WIDTH } from "@/lib/constants/business";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, SPACING } from "@/lib/constants/theme";
import type { PickWalkNextCardProps } from "@/lib/interfaces/business";

export function PickWalkNextCard({ entry, showOrderName, canPick, onPicked, onMissing }: PickWalkNextCardProps) {
  const { t } = useTranslation();
  const where = entry.locationName ?? entry.collectionName;
  const spot = pickWalkSpotLabel(entry, t);
  const orderLabel = pickWalkOrderLabel(entry, showOrderName, t);

  return (
    <Surface>
      <View style={{ gap: SPACING.md }}>
        <View style={{ flexDirection: "row", gap: SPACING.md }}>
          <CardArt
            {...cardArtSources(entry.card.image)}
            accessibilityLabel={entry.card.name}
            contentFit="cover"
            style={{
              width: PICK_WALK_NEXT_CARD_WIDTH,
              height: PICK_WALK_NEXT_CARD_WIDTH / CARD_ASPECT_RATIO,
              borderRadius: CARD_ART_RADIUS,
            }}
          />
          <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs }}>
            <AppText size="xs" tone="secondary" weight="medium">
              {t("business.picks.walk.nextUp")}
            </AppText>
            <AppText size="2xl" heading weight="bold" numberOfLines={2} accessibilityRole="header">
              {where}
            </AppText>
            <AppText size="xl" weight="semibold" tone="primary">
              {spot}
            </AppText>
            <AppText weight="medium" numberOfLines={2}>
              {entry.card.name}
            </AppText>
            <AppText size="xs" tone="secondary" numberOfLines={2}>
              {pickWalkPrintingLabel(entry, t)}
            </AppText>
            {entry.isFoil ? <Pill label={t("business.picks.walk.foil")} tone="warning" icon="sparkles" /> : null}
            {orderLabel ? (
              <AppText size="xs" tone="secondary" numberOfLines={2}>
                {orderLabel}
              </AppText>
            ) : null}
          </View>
        </View>
        {canPick ? (
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              label={t("business.picks.walk.cantFind")}
              accessibilityLabel={t("business.picks.walk.cantFindCard", { name: entry.card.name })}
              onPress={onMissing}
            />
            <Button
              style={{ flex: 1 }}
              icon="check"
              label={t("business.picks.walk.picked")}
              accessibilityLabel={t("business.picks.walk.markPicked", { name: entry.card.name, spot: `${where}, ${spot}` })}
              onPress={onPicked}
            />
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
