import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  cardFoilTypeOptions,
  cardStampOptionsFor,
  isCardCondition,
  isCardLanguage,
  reviewGridAttributesOf,
  reviewGridAttributeUpdate,
  type ReviewGridAttributes,
  type ReviewGridAttributeUpdate,
  type ReviewGridCard,
} from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { TabStrip } from "@/components/ui/tab-strip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acceptReviewCards,
  collectionReviewGridQueryOptions,
  storageReviewGridQueryOptions,
} from "@/features/cards/api/review-grid";
import { ReviewGridTile } from "@/features/cards/components/review-grid-tile";
import { useTheme } from "@/hooks/use-theme";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { REVIEW_GRID_WIDE_MIN_WIDTH } from "@/lib/constants/cards";
import { CARD_ART_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import type { ReviewGridAttributePicker, ReviewLayout } from "@/lib/interfaces/cards";
import { saveReviewLayout } from "@/lib/review-layout";

export default function ReviewGridScreen() {
  const { guid, storage: storageGuid } = useLocalSearchParams<{ guid?: string; storage?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const width = usePanelWidth();
  const columns = width >= REVIEW_GRID_WIDE_MIN_WIDTH ? 2 : 1;
  const review = useQuery(
    storageGuid ? storageReviewGridQueryOptions(storageGuid) : collectionReviewGridQueryOptions(guid ?? ""),
  );
  const [hiddenScanIds, setHiddenScanIds] = useState<Set<string>>(new Set());
  const [acceptingScanIds, setAcceptingScanIds] = useState<Set<string>>(new Set());
  const [acceptFailedCount, setAcceptFailedCount] = useState(0);
  const [attributeDrafts, setAttributeDrafts] = useState<Record<string, ReviewGridAttributes>>({});
  const [attributePicker, setAttributePicker] = useState<ReviewGridAttributePicker | null>(null);
  const savedAttributesOf = (card: ReviewGridCard) => reviewGridAttributesOf(card, t("cardDetail.foil"));
  const attributesOf = (card: ReviewGridCard) => attributeDrafts[card.scanId] ?? savedAttributesOf(card);
  const cards = review.data?.cards ?? [];
  const visibleCards = cards.filter((card) => !hiddenScanIds.has(card.scanId));
  const remaining = Math.max(visibleCards.length, (review.data?.total ?? 0) - (cards.length - visibleCards.length));
  const isWaitingForMore = visibleCards.length === 0 && remaining > 0;

  const updateSet = (setter: typeof setHiddenScanIds, scanIds: string[], included: boolean) =>
    setter((previous) => {
      const next = new Set(previous);
      for (const scanId of scanIds) {
        if (included) next.add(scanId);
        else next.delete(scanId);
      }
      return next;
    });

  const accept = async (cardsToAccept: ReviewGridCard[]) => {
    if (cardsToAccept.length === 0) return;
    const scanIds = cardsToAccept.map((card) => card.scanId);
    setAcceptFailedCount(0);
    updateSet(setAcceptingScanIds, scanIds, true);
    const attributeUpdates = new Map<string, ReviewGridAttributeUpdate>();
    for (const card of cardsToAccept) {
      const update = reviewGridAttributeUpdate(savedAttributesOf(card), attributeDrafts[card.scanId]);
      if (update) attributeUpdates.set(card.scanId, update);
    }
    const failed = await acceptReviewCards(queryClient, cardsToAccept, attributeUpdates);
    const failedScanIds = new Set(failed.map((card) => card.scanId));
    updateSet(setAcceptingScanIds, scanIds, false);
    updateSet(
      setHiddenScanIds,
      scanIds.filter((scanId) => !failedScanIds.has(scanId)),
      true,
    );
    setAcceptFailedCount(failed.length);
  };

  const switchLayout = (layout: ReviewLayout) => {
    if (layout === "grid") return;
    const first = visibleCards[0];
    if (!first) return;
    saveReviewLayout("single");
    router.replace({
      pathname: "/card/[scanId]",
      params: storageGuid
        ? { scanId: first.scanId, guid: first.collectionGuid, review: "1", storage: storageGuid }
        : { scanId: first.scanId, guid: first.collectionGuid, review: "1" },
    });
  };

  const pickerAttributes = attributePicker ? attributesOf(attributePicker.card) : null;
  const pickerOptions =
    attributePicker && pickerAttributes
      ? {
          foilType: [
            { value: "", label: t("cardDetail.foilNone") },
            ...cardFoilTypeOptions([t("cardDetail.foil")], attributePicker.card.card, pickerAttributes.foilType).map(
              (option) => ({ value: option, label: option }),
            ),
          ],
          stamp: [
            { value: "", label: t("cardDetail.stampNone") },
            ...cardStampOptionsFor(attributePicker.card.card, pickerAttributes.stamp).map((option) => ({
              value: option,
              label: option,
            })),
          ],
          condition: CARD_CONDITIONS.map((option) => ({ value: option, label: t(`cardDetail.conditions.${option}`) })),
          language: (isCardLanguage(pickerAttributes.language)
            ? [...CARD_LANGUAGES]
            : [pickerAttributes.language, ...CARD_LANGUAGES]
          ).map((option) => ({ value: option, label: LANGUAGE_LABELS[option] ?? option })),
        }[attributePicker.field]
      : [];
  const pickerTitles = {
    foilType: t("cardDetail.foil"),
    stamp: t("cardDetail.stamp"),
    condition: t("cardDetail.condition"),
    language: t("cardDetail.language"),
  };
  const choosePickerOption = (value: string) => {
    if (!attributePicker || !pickerAttributes) return;
    const { card, field } = attributePicker;
    const next: ReviewGridAttributes =
      field === "condition"
        ? isCardCondition(value)
          ? { ...pickerAttributes, condition: value }
          : pickerAttributes
        : field === "language"
          ? { ...pickerAttributes, language: value }
          : { ...pickerAttributes, [field]: value === "" ? null : value };
    setAttributeDrafts((previous) => ({ ...previous, [card.scanId]: next }));
    setAttributePicker(null);
  };

  const tileWidth = (width - SCREEN_GUTTER * 2 - SPACING.md * (columns - 1)) / columns;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("reviewGrid.title")}
        subtitle={review.data ? t("reviewGrid.remaining", { count: remaining }) : null}
        onBack={() => router.back()}
      />
      <FlatList
        key={columns}
        data={visibleCards}
        keyExtractor={(card) => card.scanId}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: SPACING.md } : undefined}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg + SPACING.xs }}
        refreshControl={
          <RefreshControl
            refreshing={review.isRefetching}
            onRefresh={() => void review.refetch()}
            tintColor={colors.primaryText}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, paddingTop: SPACING.lg }}>
            <View style={{ marginHorizontal: -SCREEN_GUTTER }}>
              <TabStrip<ReviewLayout>
                items={[
                  { value: "grid", label: t("reviewGrid.layoutGrid") },
                  { value: "single", label: t("reviewGrid.layoutOneByOne") },
                ]}
                value="grid"
                onChange={switchLayout}
              />
            </View>
            {visibleCards.length > 0 ? (
              <Button
                icon="checkAll"
                label={t("reviewGrid.acceptAll", { count: visibleCards.length })}
                loading={acceptingScanIds.size > 0 && visibleCards.every((card) => acceptingScanIds.has(card.scanId))}
                onPress={() => void accept(visibleCards)}
              />
            ) : null}
            {review.isError ? <Callout tone="destructive" title={t("reviewGrid.loadFailed")} /> : null}
            {acceptFailedCount > 0 ? (
              <Callout tone="destructive" title={t("reviewGrid.acceptFailed", { count: acceptFailedCount })} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          review.isPending || isWaitingForMore ? (
            <View style={{ gap: SPACING.md }}>
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} width={tileWidth} height={tileWidth * 0.85} radius={CARD_ART_RADIUS} />
              ))}
            </View>
          ) : review.isError ? null : (
            <EmptyState
              icon="success"
              title={t("reviewGrid.doneTitle")}
              description={t("reviewGrid.doneDescription")}
              action={<Button variant="secondary" label={t("reviewGrid.done")} onPress={() => router.back()} />}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={{ width: tileWidth }}>
            <ReviewGridTile
              card={item}
              attributes={attributesOf(item)}
              onPickAttribute={(field) => setAttributePicker({ card: item, field })}
              accepting={acceptingScanIds.has(item.scanId)}
              onAccept={() => void accept([item])}
              onCorrect={() =>
                router.push({ pathname: "/card/[scanId]", params: { scanId: item.scanId, guid: item.collectionGuid } })
              }
            />
          </View>
        )}
      />
      <OptionSheet
        visible={!!attributePicker}
        title={attributePicker ? pickerTitles[attributePicker.field] : ""}
        options={pickerOptions}
        selected={
          attributePicker && pickerAttributes ? [pickerAttributes[attributePicker.field] ?? ""] : []
        }
        onSelect={choosePickerOption}
        onClose={() => setAttributePicker(null)}
      />
    </View>
  );
}
