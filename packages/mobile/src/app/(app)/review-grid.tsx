import { LANGUAGE_LABELS } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, FlatList, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
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
import {
  acceptReviewCards,
  collectionReviewGridQueryOptions,
  loadCollectionReviewCardPage,
  loadStorageReviewCardPage,
  storageReviewGridQueryOptions,
} from "@/features/cards/api/review-grid";
import { useReviewAutoCheck } from "@/features/cards/api/use-review-auto-check";
import { ReviewGridTile } from "@/features/cards/components/review-grid-tile";
import { ReviewGridTileSkeleton } from "@/features/cards/components/review-grid-tile-skeleton";
import { useTheme } from "@/hooks/use-theme";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { REVIEW_GRID_SKELETON_SINGLE_COLUMN_TILE_COUNT, REVIEW_GRID_WIDE_MIN_WIDTH } from "@/lib/constants/cards";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ReviewGridAttributePicker, ReviewLayout } from "@/lib/interfaces/cards";
import { saveReviewLayout } from "@/lib/review-layout";

export default function ReviewGridScreen() {
  const { guid, storage: storageGuid } = useLocalSearchParams<{ guid?: string; storage?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const width = usePanelWidth();
  const columns = width >= REVIEW_GRID_WIDE_MIN_WIDTH ? 2 : 1;
  const collectionReview = useQuery({ ...collectionReviewGridQueryOptions(guid ?? ""), enabled: !storageGuid });
  const storageReview = useQuery({ ...storageReviewGridQueryOptions(storageGuid ?? ""), enabled: !!storageGuid });
  const review = storageGuid ? storageReview : collectionReview;
  const [hiddenScanIds, setHiddenScanIds] = useState<Set<string>>(new Set());
  const [acceptFailedCount, setAcceptFailedCount] = useState(0);
  const [attributeDrafts, setAttributeDrafts] = useState<Record<string, ReviewGridAttributes>>({});
  const [attributePicker, setAttributePicker] = useState<ReviewGridAttributePicker | null>(null);
  const savedAttributesOf = (card: ReviewGridCard) => reviewGridAttributesOf(card, t("cardDetail.foil"));
  const attributesOf = (card: ReviewGridCard) => attributeDrafts[card.scanId] ?? savedAttributesOf(card);
  const updateSet = (setter: typeof setHiddenScanIds, scanIds: string[], included: boolean) =>
    setter((previous) => {
      const next = new Set(previous);
      for (const scanId of scanIds) {
        if (included) next.add(scanId);
        else next.delete(scanId);
      }
      return next;
    });

  const autoCheck = useReviewAutoCheck({
    cards: review.data?.cards ?? [],
    hiddenScanIds,
    remainingTotal: review.data?.total ?? 0,
    loadReviewCardPage: storageGuid
      ? (page) => loadStorageReviewCardPage(storageGuid, page)
      : guid
        ? (page) => loadCollectionReviewCardPage(guid, page)
        : undefined,
    onConfirmed: (scanIds) => updateSet(setHiddenScanIds, scanIds, true),
    onFinished: () => void review.refetch(),
  });
  const cards = autoCheck.cards;
  const visibleCards = cards.filter((card) => !hiddenScanIds.has(card.scanId));
  const remaining = Math.max(visibleCards.length, (review.data?.total ?? 0) - (cards.length - visibleCards.length));
  const isWaitingForMore = visibleCards.length === 0 && remaining > 0;

  const listRef = useRef<FlatList<ReviewGridCard>>(null);
  const reduceMotion = useReducedMotion();
  const firstCheckingIndex = visibleCards.findIndex((card) => autoCheck.checkingScanIds.has(card.scanId));
  const firstCheckingRow = firstCheckingIndex === -1 ? -1 : Math.floor(firstCheckingIndex / columns);
  useEffect(() => {
    if (firstCheckingRow === -1) return;
    listRef.current?.scrollToIndex({ index: firstCheckingRow, viewPosition: 0.5, animated: !reduceMotion });
  }, [firstCheckingRow, reduceMotion]);

  const accept = async (cardsToAccept: ReviewGridCard[]) => {
    if (cardsToAccept.length === 0) return;
    const scanIds = cardsToAccept.map((card) => card.scanId);
    setAcceptFailedCount(0);
    updateSet(setHiddenScanIds, scanIds, true);
    const attributeUpdates = new Map<string, ReviewGridAttributeUpdate>();
    for (const card of cardsToAccept) {
      const update = reviewGridAttributeUpdate(savedAttributesOf(card), attributeDrafts[card.scanId]);
      if (update) attributeUpdates.set(card.scanId, update);
    }
    const failed = await acceptReviewCards(queryClient, cardsToAccept, attributeUpdates);
    updateSet(
      setHiddenScanIds,
      failed.map((card) => card.scanId),
      false,
    );
    setAcceptFailedCount(failed.length);
    const acceptedCount = cardsToAccept.length - failed.length;
    if (acceptedCount > 0) {
      AccessibilityInfo.announceForAccessibility(t("reviewGrid.accepted", { count: acceptedCount }));
    }
  };

  const confirmAcceptAll = () => {
    if (visibleCards.length <= 1) {
      void accept(visibleCards);
      return;
    }
    const cardsToAccept = visibleCards;
    Alert.alert(
      t("reviewGrid.acceptAllConfirmTitle", { count: cardsToAccept.length }),
      t("reviewGrid.acceptAllConfirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("reviewGrid.acceptAll", { count: cardsToAccept.length }), onPress: () => void accept(cardsToAccept) },
      ],
    );
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
        subtitle={
          autoCheck.status === "running" && autoCheck.progress
            ? t("reviewGrid.autoChecking", autoCheck.progress)
            : autoCheck.status === "pausing"
              ? t("reviewGrid.autoCheckPausing")
              : autoCheck.status === "paused" && autoCheck.progress
                ? t("reviewGrid.autoCheckPaused", autoCheck.progress)
                : review.data
                  ? t("reviewGrid.remaining", { count: remaining })
                  : null
        }
        onBack={() => router.back()}
        tabs={
          <TabStrip<ReviewLayout>
            items={[
              { value: "grid", label: t("reviewGrid.layoutGrid") },
              { value: "single", label: t("reviewGrid.layoutOneByOne") },
            ]}
            value="grid"
            onChange={switchLayout}
          />
        }
      />
      <FlatList
        ref={listRef}
        key={columns}
        onScrollToIndexFailed={({ averageItemLength, index }) =>
          listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: !reduceMotion })
        }
        data={visibleCards}
        keyExtractor={(card) => card.scanId}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: SPACING.md } : undefined}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg + SPACING.xs }}
        refreshControl={
          <PullToRefreshControl
            onRefresh={() => review.refetch()}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: SPACING.md }}>
            {autoCheck.isAvailable && (autoCheck.status === "running" || autoCheck.status === "pausing") ? (
              <Button
                variant="secondary"
                icon="pause"
                label={t("reviewGrid.autoCheckPause")}
                loading={autoCheck.status === "pausing"}
                disabled={autoCheck.status === "pausing"}
                onPress={autoCheck.pause}
              />
            ) : autoCheck.isAvailable && visibleCards.length > 0 ? (
              <Button
                variant="secondary"
                icon={autoCheck.status === "paused" ? "play" : "sparkles"}
                label={autoCheck.status === "paused" ? t("reviewGrid.autoCheckResume") : t("reviewGrid.autoCheck")}
                accessibilityHint={t("reviewGrid.autoCheckHint")}
                disabled={!autoCheck.canRun}
                onPress={() => void autoCheck.run()}
              />
            ) : null}
            {visibleCards.length > 0 ? (
              <Button
                icon="checkAll"
                label={t("reviewGrid.acceptAll", { count: visibleCards.length })}
                onPress={confirmAcceptAll}
              />
            ) : null}
            {review.isError ? (
              <Callout
                tone="destructive"
                title={t("reviewGrid.loadFailed")}
                action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void review.refetch()} />}
              />
            ) : null}
            {acceptFailedCount > 0 ? (
              <Callout tone="destructive" title={t("reviewGrid.acceptFailed", { count: acceptFailedCount })} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          review.isPending || isWaitingForMore ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.md }}>
              {Array.from({ length: columns > 1 ? columns : REVIEW_GRID_SKELETON_SINGLE_COLUMN_TILE_COUNT }).map((_, index) => (
                <View key={index} style={{ width: tileWidth }}>
                  <ReviewGridTileSkeleton />
                </View>
              ))}
            </View>
          ) : review.isError ? undefined : (
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
              onAccept={() => void accept([item])}
              onCorrect={() =>
                router.push({ pathname: "/card/[scanId]", params: { scanId: item.scanId, guid: item.collectionGuid } })
              }
              autoCheckOutcome={autoCheck.outcomes.get(item.scanId)}
              isAutoChecking={autoCheck.checkingScanIds.has(item.scanId)}
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
