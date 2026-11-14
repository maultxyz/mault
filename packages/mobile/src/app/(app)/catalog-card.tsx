import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { useToast } from "@/components/ui/toast-provider";
import { useAddCatalogCard } from "@/features/cards/api/add-catalog-card";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { catalogCardQueryOptions } from "@/features/search/api/catalog-card-search";
import { catalogGamesOf } from "@/features/search/lib/catalog-games";
import { usePricing } from "@/hooks/use-pricing";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CATALOG_CARD_ART_WIDTH } from "@/lib/constants/search";
import { CARD_ART_RADIUS, SPACING } from "@/lib/constants/theme";
import { cardArtSources } from "@/lib/card-art";
import type { CatalogCardRouteParams } from "@/lib/interfaces/search";

export default function CatalogCardScreen() {
  const { t } = useTranslation();
  const { id, gameKey } = useLocalSearchParams<CatalogCardRouteParams>();
  const { collections, collection: scanTargetCollection } = useScanTarget();
  const pricing = usePricing();
  const { showToast } = useToast();
  const addCard = useAddCatalogCard();
  const [pickerOpen, setPickerOpen] = useState(false);
  const game = catalogGamesOf(collections, scanTargetCollection?.guid).find((entry) => entry.gameKey === gameKey) ?? null;
  const { data: card, isPending, isError } = useQuery(catalogCardQueryOptions(game, id));
  const targets = collections.filter((collection) => collection.game?.key === gameKey);
  const defaultTarget = targets.find((collection) => collection.guid === scanTargetCollection?.guid) ?? targets[0] ?? null;

  const add = (collectionGuid: string) => {
    if (!card) return;
    const target = targets.find((collection) => collection.guid === collectionGuid);
    if (!target) return;
    addCard.mutate(
      { collectionGuid, card },
      {
        onSuccess: () =>
          showToast({
            message: t("catalogCard.added", { name: card.name, collection: target.name }),
            tone: "success",
            action: {
              label: t("catalogCard.view"),
              onPress: () => router.push({ pathname: "/collection/[guid]", params: { guid: target.guid } }),
            },
          }),
        onError: () =>
          showToast({
            message: t("catalogCard.addFailed"),
            tone: "destructive",
            action: { label: t("recovery.retry"), onPress: () => add(collectionGuid) },
          }),
      },
    );
  };

  const price = card ? pricing.priceOf(card, false) : null;
  const foilPrice = card ? pricing.priceOf(card, true) : null;
  const details = card
    ? [
        { key: "set", title: t("catalogCard.set"), value: card.setName || card.set.toUpperCase() },
        { key: "number", title: t("catalogCard.number"), value: card.collectorNumber ? `#${card.collectorNumber}` : null },
        { key: "rarity", title: t("catalogCard.rarity"), value: card.rarity || null },
        { key: "type", title: t("catalogCard.type"), value: card.typeLine || null },
        { key: "artist", title: t("catalogCard.artist"), value: card.artist || null },
        { key: "game", title: t("catalogCard.game"), value: game?.gameName ?? null },
      ].filter((detail): detail is { key: string; title: string; value: string } => !!detail.value)
    : [];

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<PageHeader title={card?.name ?? t("catalogCard.title")} onBack={() => router.back()} />}>
        {isError || (!isPending && !card) ? (
          <Callout tone="destructive" title={t("catalogCard.loadFailed")} />
        ) : isPending || !card ? (
          <PageSkeleton />
        ) : (
          <>
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: CATALOG_CARD_ART_WIDTH,
                  aspectRatio: CARD_ASPECT_RATIO,
                  borderRadius: CARD_ART_RADIUS,
                  overflow: "hidden",
                }}
              >
                <CardArt
                  {...cardArtSources(card.image)}
                  accessibilityLabel={card.name}
                  style={{ flex: 1 }}
                  contentFit="cover"
                />
              </View>
            </View>

            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("catalogCard.prices")} />
              <ListGroup>
                <ListRow
                  title={t("catalogCard.price")}
                  value={price != null ? pricing.format(price) : t("catalogCard.noPrice")}
                />
                {foilPrice != null && foilPrice !== price ? (
                  <ListRow title={t("catalogCard.foilPrice")} value={pricing.format(foilPrice)} />
                ) : null}
              </ListGroup>
            </View>

            {details.length > 0 ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("catalogCard.details")} />
                <ListGroup>
                  {details.map((detail) => (
                    <ListRow key={detail.key} title={detail.title} value={detail.value} />
                  ))}
                </ListGroup>
              </View>
            ) : null}

            {card.text ? (
              <AppText size="sm" tone="secondary">
                {card.text}
              </AppText>
            ) : null}

            {targets.length === 0 ? (
              <Callout tone="info" title={t("catalogCard.noCollection", { game: game?.gameName ?? "" })} />
            ) : null}
          </>
        )}
      </Screen>

      {card && targets.length > 0 ? (
        <BottomActionBar>
          <Button
            icon="plus"
            label={
              targets.length === 1 && defaultTarget
                ? t("catalogCard.addTo", { collection: defaultTarget.name })
                : t("catalogCard.add")
            }
            loading={addCard.isPending}
            onPress={() => {
              if (targets.length === 1 && defaultTarget) add(defaultTarget.guid);
              else setPickerOpen(true);
            }}
          />
        </BottomActionBar>
      ) : null}

      <OptionSheet
        visible={pickerOpen}
        title={t("catalogCard.chooseCollection")}
        options={targets.map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={defaultTarget ? [defaultTarget.guid] : []}
        onSelect={(collectionGuid) => {
          setPickerOpen(false);
          add(collectionGuid);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
