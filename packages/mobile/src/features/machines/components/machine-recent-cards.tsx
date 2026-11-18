import { MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { useSessionStream } from "@/features/monitor/api/use-session-stream";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { cardArtSources } from "@/lib/card-art";
import {
  MACHINE_RECENT_CARD_ART_WIDTH,
  MACHINE_RECENT_CARD_WIDTH_FRACTION,
  MACHINE_RECENT_CARDS_COUNT,
} from "@/lib/constants/machines";
import { SCREEN_GUTTER, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { MachinePanelProps, MachineRecentCardsStripProps } from "@/lib/interfaces/machines";

function MachineRecentCardsStrip({ collectionGuid, fallback }: MachineRecentCardsStripProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const { width } = useWindowDimensions();
  const { recentCards } = useSessionStream(collectionGuid);
  const cards = recentCards.slice(0, MACHINE_RECENT_CARDS_COUNT);
  const cardWidth = Math.min(width, 520) * MACHINE_RECENT_CARD_WIDTH_FRACTION;

  if (cards.length === 0) {
    return (
      <Surface>
        <AppText size="sm" tone="secondary">
          {fallback}
        </AppText>
      </Surface>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + SPACING.sm}
      decelerationRate="fast"
      contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER }}
      style={{ marginHorizontal: -SCREEN_GUTTER }}
    >
      {cards.map((entry) => {
        const price = pricing.priceOf(entry.card, { isFoil: !!entry.isFoil, foilType: entry.foilType ?? null }, entry.condition);
        const art = cardArtSources(entry.card.image);
        return (
          <Pressable
            key={entry.scanId}
            accessibilityRole="button"
            accessibilityLabel={t("machines.recent.open", { name: entry.card.name })}
            onPress={() =>
              router.push({ pathname: "/card/[scanId]", params: { scanId: entry.scanId, guid: collectionGuid, review: "1" } })
            }
            style={({ pressed }) => ({
              width: cardWidth,
              flexDirection: "row",
              gap: SPACING.md,
              padding: SPACING.md,
              borderRadius: SURFACE_RADIUS,
              backgroundColor: colors.card,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <CardThumbnail {...art} width={MACHINE_RECENT_CARD_ART_WIDTH} />
            <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs }}>
              <AppText size="sm" weight="semibold" numberOfLines={1}>
                {entry.card.name}
              </AppText>
              {entry.card.setName ? (
                <AppText size="xs" tone="secondary" numberOfLines={1}>
                  {entry.card.setName}
                </AppText>
              ) : null}
              {entry.binNumber != null ? (
                <AppText size="xs" tone="secondary">
                  {t("machines.recent.bin", { number: entry.binNumber })}
                </AppText>
              ) : null}
              {entry.lowConfidenceMatch ? (
                <AppText size="xs" tone="warning">
                  {t("machines.recent.lowConfidence")}
                </AppText>
              ) : null}
              <AppText
                size="sm"
                weight="semibold"
                accessibilityLabel={price == null ? t("priceTable.noPrice") : undefined}
                style={{ marginTop: "auto" }}
              >
                {price != null ? pricing.format(price) : MISSING_PRICE_TEXT}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function MachineRecentCards({ machine }: MachinePanelProps) {
  const { t } = useTranslation();
  const fallback = machine.lastCard?.name
    ? t("machines.recent.lastCard", { name: machine.lastCard.name })
    : t("machines.recent.empty");

  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={t("machines.recent.title")} />
      {machine.collectionGuid ? (
        <MachineRecentCardsStrip collectionGuid={machine.collectionGuid} fallback={fallback} />
      ) : (
        <Surface>
          <AppText size="sm" tone="secondary">
            {fallback}
          </AppText>
        </Surface>
      )}
    </View>
  );
}
