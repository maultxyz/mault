import { LANGUAGE_LABELS } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, Pressable, View } from "react-native";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  CARD_TAGS,
  cardTagsSetOn,
  cardFoilTypeOptions,
  cardStampOptionsFor,
  DEFAULT_CARD_CONDITION,
  isCardLanguage,
  scanLanguage,
  type CardCondition,
  type PlayingCard,
  scanDraftFormSchema,
  type ScanDraftFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardCorrection } from "@/features/cards/api/use-card-correction";
import { useDeferredCardRemoval } from "@/features/cards/api/use-deferred-card-removal";
import {
  patchCardsInCaches,
  restoreCardCaches,
  reviewedCardPatch,
  setCardTagsInCaches,
  snapshotCardCaches,
} from "@/features/cards/lib/card-list-cache";
import { useToast } from "@/components/ui/toast-provider";
import { usePrefetchCardDetails } from "@/features/cards/api/use-prefetch-card-details";
import { BinLocationDiagram } from "@/features/cards/components/bin-location-diagram";
import { CandidateStrip } from "@/features/cards/components/candidate-strip";
import { CardDetailSkeleton, PricePaidFieldSkeleton } from "@/features/cards/components/card-detail-skeleton";
import type {
  CardDetailSheet,
  CardReviewAccept,
  CardReviewAcceptState,
  CardTagToggle,
  MatchesOpenState,
  ScanDraftSave,
} from "@/lib/interfaces/cards";
import type { CardCachePatchContext } from "@/lib/interfaces/undo";
import type { IconName } from "@/lib/interfaces/ui";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { CardDetailArt, CardImageFrame } from "@/features/cards/components/card-detail-art";
import { CardDetailInfoSections } from "@/features/cards/components/card-detail-info-sections";
import { CardDetailTitleBlock } from "@/features/cards/components/card-detail-title-block";
import { PricePaidField } from "@/features/cards/components/price-paid-field";
import { cardAcquisitionCostQueryOptions, setCardAcquisitionCost } from "@/features/business/api/card-cost";
import {
  cachedCollectionCardPosition,
  cardScanOriginQueryOptions,
  setCollectionCardTags,
  collectionCardQueryOptions,
  invalidateCollectionCards,
  scanImageQueryOptions,
  updateCollectionCard,
} from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useMoveCardsToCollection } from "@/features/collections/api/use-move-cards-to-collection";
import { useCopyCardShareLink } from "@/features/share-links/api/use-copy-card-share-link";
import { useShareScanImage } from "@/features/cards/api/use-share-scan-image";
import { billingQueryOptions } from "@/features/org/api/billing";
import {
  cardStorageLocationQueryOptions,
  fetchFirstUnreviewedStorageCard,
  moveCardsToStorageLocation,
  removeCardsFromStorageLocations,
  storageLocationCardContextQueryOptions,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import {
  CARD_DETAIL_HEADER_ACTION_COUNT,
  CARD_DETAIL_MENU_SHEETS,
  CARD_DETAIL_SHARE_ACTION,
  CARD_REVIEW_ACCEPT_MUTATION_KEY,
} from "@/lib/constants/cards";
import { formatDateTime } from "@/lib/dates";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { PAGE_HEADER_ICON_BUTTON_SIZE, TOAST_UNDO_DURATION_MS } from "@/lib/constants/ui";
import { saveReviewLayout } from "@/lib/review-layout";
import { absoluteUrl } from "@/lib/url";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function CardDetailScreen() {
  const { scanId, guid, review, storage: storageGuid } = useLocalSearchParams<{
    scanId: string;
    guid: string;
    review?: string;
    storage?: string;
  }>();
  const reviewMode = review === "1";
  const storageReview = reviewMode && !!storageGuid;
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const position = useQuery({
    ...collectionCardQueryOptions(guid, scanId, reviewMode && !storageReview),
    placeholderData: reviewMode ? undefined : () => cachedCollectionCardPosition(queryClient, guid, scanId),
  });
  const storageContext = useQuery(storageLocationCardContextQueryOptions(storageGuid ?? "", scanId, storageReview));
  const image = useQuery(scanImageQueryOptions(guid, scanId));
  const origin = useQuery(cardScanOriginQueryOptions(guid, scanId));
  const hasScanOrigin =
    !!origin.data && (!!origin.data.scannedAt || !!origin.data.scannedBy || !!origin.data.device);
  const storage = useQuery(cardStorageLocationQueryOptions(guid, scanId));
  const activeOrgId = useActiveOrgId();
  const collections = useQuery(collectionsQueryOptions(activeOrgId));
  const acquisitionCost = useQuery(cardAcquisitionCostQueryOptions(activeOrgId, scanId));
  const correction = useCardCorrection(guid);
  const [editing, setEditing] = useState(false);
  const [matchesOpenState, setMatchesOpenState] = useState<MatchesOpenState | null>(null);
  const [sheet, setSheet] = useState<CardDetailSheet | null>(null);
  const billing = useQuery(billingQueryOptions(activeOrgId));
  const canMoveToLocation = !!billing.data && billing.data.storage !== false;
  const locations = useQuery(storageLocationsQueryOptions(activeOrgId, canMoveToLocation));
  const moveTargets = (locations.data ?? []).filter((location) => location.guid !== storage.data?.guid);

  const entry = position.data?.entry.scanId === scanId ? position.data.entry : null;
  const nextScanId = position.data?.nextScanId ?? null;
  const reviewPrefetchStartScanId = !reviewMode
    ? null
    : storageReview
      ? storageContext.data?.next?.scanId
      : entry
        ? nextScanId
        : null;
  usePrefetchCardDetails(reviewPrefetchStartScanId, {
    collectionGuid: guid,
    reviewMode: reviewMode && !storageReview,
    storageGuid: storageReview ? storageGuid : undefined,
  });
  const collection = collections.data?.find((c) => c.guid === guid);
  const gameFoilOptions = collection?.game?.foilTypes?.length ? collection.game.foilTypes : [t("cardDetail.foil")];
  const card = entry?.card;
  const frontCapturedUrl = absoluteUrl(image.data?.capturedImageUrl);
  const capturedBackUrl = absoluteUrl(image.data?.capturedBackImageUrl);
  const [backSideScanId, setBackSideScanId] = useState<string | null>(null);
  const showsCapturedBackSide = !!capturedBackUrl && backSideScanId === scanId;
  const capturedUrl = showsCapturedBackSide ? capturedBackUrl : frontCapturedUrl;
  const showCaptured = image.isPending || !!capturedUrl;
  const canConfirm = !!entry && (!!entry.lowConfidenceMatch || !!entry.alternativeMatches?.length) && !entry.corrected;
  const isReviewed = !!entry?.reviewed || !!entry?.corrected;
  const tagsSet = entry ? cardTagsSetOn(entry) : [];
  const areMatchesOpen = matchesOpenState?.scanId === scanId ? matchesOpenState.isOpen : !isReviewed;

  const candidates = useMemo(() => {
    if (!entry) return [];
    const seen = new Set<string>();
    return [entry.card, ...(entry.alternativeMatches ?? [])].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [entry]);

  const serverValues = useMemo<ScanDraftFormValues | undefined>(
    () =>
      entry
        ? {
            foilType: entry.foilType ?? (entry.isFoil ? gameFoilOptions[0] : null),
            stamp: entry.stamp ?? null,
            condition: entry.condition ?? DEFAULT_CARD_CONDITION,
            language: scanLanguage(entry),
            acquisitionCost: acquisitionCost.data?.cost ?? null,
          }
        : undefined,
    [entry, gameFoilOptions, acquisitionCost.data],
  );
  const form = useForm<ScanDraftFormValues>({
    resolver: zodResolver(scanDraftFormSchema),
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty, errors } = form.formState;
  const draftFoil = form.watch("foilType");
  const draftStamp = form.watch("stamp");
  const draftCondition = form.watch("condition") as CardCondition;
  const draftLanguage = form.watch("language");
  const languageOptions: string[] =
    !draftLanguage || isCardLanguage(draftLanguage) ? [...CARD_LANGUAGES] : [draftLanguage, ...CARD_LANGUAGES];
  const price = card
    ? pricing.priceOf(card, { isFoil: draftFoil != null, foilType: draftFoil, stamp: draftStamp }, draftCondition)
    : null;
  const foilOptions = cardFoilTypeOptions(gameFoilOptions, card, draftFoil);
  const stampOptions = cardStampOptionsFor(card, draftStamp);

  const saveDraft = useMutation({
    mutationFn: async ({ values, dirtyFields }: ScanDraftSave) => {
      if (dirtyFields.foilType || dirtyFields.stamp || dirtyFields.condition || dirtyFields.language) {
        await updateCollectionCard(guid, scanId, {
          isFoil: values.foilType != null,
          foilType: values.foilType,
          condition: values.condition as CardCondition,
          ...(dirtyFields.stamp ? { stamp: values.stamp } : {}),
          ...(dirtyFields.language ? { language: values.language } : {}),
        });
      }
      if (dirtyFields.acquisitionCost) {
        await setCardAcquisitionCost(scanId, values.acquisitionCost);
      }
    },
    onMutate: async ({ values, dirtyFields }: ScanDraftSave): Promise<CardCachePatchContext> => {
      const snapshot = await patchCardsInCaches(queryClient, guid, [scanId], {
        ...(dirtyFields.foilType ? { isFoil: values.foilType != null, foilType: values.foilType } : {}),
        ...(dirtyFields.stamp ? { stamp: values.stamp } : {}),
        ...(dirtyFields.condition ? { condition: values.condition as CardCondition } : {}),
        ...(dirtyFields.language && values.language ? { language: values.language } : {}),
      });
      return { snapshot };
    },
    onSuccess: (_, { values }) => {
      form.reset(values);
      AccessibilityInfo.announceForAccessibility(t("common.changesSaved"));
    },
    onError: (_error, _save, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
    },
    onSettled: () => {
      invalidateCollectionCards(queryClient, guid);
      void queryClient.invalidateQueries({ queryKey: cardAcquisitionCostQueryOptions(activeOrgId, scanId).queryKey });
    },
  });

  const submitDraft = form.handleSubmit((values) =>
    saveDraft.mutate({ values, dirtyFields: { ...form.formState.dirtyFields } }),
  );

  const markCorrect = useMutation({
    mutationFn: (kind: "confirm" | "review") =>
      updateCollectionCard(guid, scanId, kind === "confirm" ? { confirmed: true } : { reviewed: true }),
    onMutate: async (kind): Promise<CardCachePatchContext> => ({
      snapshot: await patchCardsInCaches(queryClient, guid, [scanId], reviewedCardPatch(kind)),
    }),
    onError: (_error, _kind, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
    },
    onSettled: () => invalidateCollectionCards(queryClient, guid),
  });

  const acceptInBackground = useMutation({
    mutationKey: [CARD_REVIEW_ACCEPT_MUTATION_KEY, guid],
    mutationFn: ({ kind, acceptedScanId }: CardReviewAccept) =>
      updateCollectionCard(guid, acceptedScanId, kind === "confirm" ? { confirmed: true } : { reviewed: true }),
    onMutate: async ({ kind, acceptedScanId }): Promise<CardCachePatchContext> => ({
      snapshot: await patchCardsInCaches(queryClient, guid, [acceptedScanId], reviewedCardPatch(kind)),
    }),
    onSettled: () => invalidateCollectionCards(queryClient, guid),
    onError: (_error, _variables, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
      AccessibilityInfo.announceForAccessibility(t("cardDetail.reviewAcceptFailed"));
    },
  });
  const reviewAcceptStates = useMutationState<CardReviewAcceptState>({
    filters: { mutationKey: [CARD_REVIEW_ACCEPT_MUTATION_KEY, guid] },
    select: (mutation) => ({
      status: mutation.state.status,
      variables: mutation.state.variables as CardReviewAccept | undefined,
    }),
  });
  const latestReviewAccept = reviewAcceptStates.at(-1);
  const failedReviewAccept = latestReviewAccept?.status === "error" ? latestReviewAccept.variables : undefined;

  const toggleTag = useMutation({
    mutationFn: ({ tag, enabled }: CardTagToggle) =>
      setCollectionCardTags(guid, { scanIds: [scanId], tags: [tag], enabled }),
    onMutate: async ({ tag, enabled }: CardTagToggle) => {
      await queryClient.cancelQueries({ queryKey: ["collection-card", guid] });
      const snapshot = snapshotCardCaches(queryClient, guid);
      setCardTagsInCaches(queryClient, guid, [scanId], [tag], enabled);
      return { snapshot };
    },
    onSuccess: (_result, toggle) =>
      AccessibilityInfo.announceForAccessibility(
        t(toggle.enabled ? "recovery.tagAdded" : "recovery.tagRemoved", { tag: t(`cardTags.names.${toggle.tag}`) }),
      ),
    onError: (_error, _toggle, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
      AccessibilityInfo.announceForAccessibility(t("cardTags.saveFailed"));
    },
    onSettled: () => invalidateCollectionCards(queryClient, guid),
  });

  const removeCardsWithUndo = useDeferredCardRemoval();

  const { targetCollections, moveToCollection } = useMoveCardsToCollection({
    sourceCollectionGuid: guid,
    onMoved: () => router.back(),
  });

  const refreshAfterLocationChange = () => {
    void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    invalidateCollectionCards(queryClient, guid);
  };

  const restoreLocation = useMutation({
    mutationFn: (previousLocationGuid: string | null) =>
      previousLocationGuid
        ? moveCardsToStorageLocation(previousLocationGuid, [scanId])
        : removeCardsFromStorageLocations([scanId]).then(() => undefined),
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("recovery.restored")),
    onError: () => showToast({ message: t("recovery.undoFailed"), tone: "destructive" }),
    onSettled: refreshAfterLocationChange,
  });

  const moveToLocation = useMutation({
    mutationFn: (locationGuid: string) => moveCardsToStorageLocation(locationGuid, [scanId]),
    onMutate: () => ({ previousLocationGuid: storage.data?.guid ?? null }),
    onSuccess: (_result, locationGuid, context) => {
      refreshAfterLocationChange();
      router.back();
      const locationName = (locations.data ?? []).find((location) => location.guid === locationGuid)?.name ?? "";
      showToast({
        message: t("recovery.movedTo", { name: locationName }),
        durationMs: TOAST_UNDO_DURATION_MS,
        action: { label: t("recovery.undo"), onPress: () => restoreLocation.mutate(context.previousLocationGuid) },
      });
    },
    onError: () => AccessibilityInfo.announceForAccessibility(t("storage.actionFailed")),
  });

  const copyShareLink = useCopyCardShareLink();
  const shareScanImage = useShareScanImage();
  const actionMenuOptions = [
    ...(reviewMode ? [] : [{ value: CARD_DETAIL_SHARE_ACTION, label: t("cardDetail.share") }]),
    { value: "collection", label: t("storage.moveToCollection") },
    ...(canMoveToLocation
      ? [{ value: "location", label: storage.data ? t("storage.moveToOtherLocation") : t("storage.moveToLocation") }]
      : []),
  ];

  usePreventRemove(isDirty && !saveDraft.isPending, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("cardDetail.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const goToNextInReview = async () => {
    if (storageReview && storageGuid) {
      const context = await queryClient
        .fetchQuery({ ...storageLocationCardContextQueryOptions(storageGuid, scanId, true), staleTime: 0 })
        .catch(() => storageContext.data ?? null);
      const next = context?.next ?? (await fetchFirstUnreviewedStorageCard(storageGuid).catch(() => null));
      if (next && next.scanId !== scanId) {
        router.replace({
          pathname: "/card/[scanId]",
          params: { scanId: next.scanId, guid: next.collectionGuid, review: "1", storage: storageGuid },
        });
      } else {
        router.back();
        Alert.alert(t("cardDetail.reviewCompleteTitle"), t("cardDetail.reviewCompleteDescription"));
      }
      return;
    }
    if (nextScanId) {
      router.replace({ pathname: "/card/[scanId]", params: { scanId: nextScanId, guid, review: "1" } });
    } else {
      router.back();
      Alert.alert(t("cardDetail.reviewCompleteTitle"), t("cardDetail.reviewCompleteDescription"));
    }
  };

  const applyCorrection = async (selected: PlayingCard) => {
    if (!entry) return;
    setMatchesOpenState({ scanId, isOpen: false });
    await correction.correct(entry, selected);
    setEditing(false);
    if (reviewMode) await goToNextInReview();
  };

  const acceptInReview = async () => {
    const kind = canConfirm ? "confirm" : "review";
    if (storageReview) {
      await markCorrect.mutateAsync(kind);
      await goToNextInReview();
      return;
    }
    acceptInBackground.mutate({ kind, acceptedScanId: scanId });
    await goToNextInReview();
  };

  const showReviewGrid = () => {
    saveReviewLayout("grid");
    router.replace({ pathname: "/review-grid", params: storageReview ? { storage: storageGuid } : { guid } });
  };

  const removeWithUndo = () => {
    removeCardsWithUndo({ collectionGuid: guid, scanIds: [scanId] });
    router.back();
  };

  const attributePill = (icon: IconName, fieldLabel: string, value: string, menuSheet: CardDetailSheet) => (
    <PillButton
      key={menuSheet}
      icon={icon}
      label={value}
      accessibilityLabel={`${fieldLabel}: ${value}`}
      onPress={() => setSheet(menuSheet)}
    />
  );
  const scanAttributePills = [
    attributePill("sparkles", t("cardDetail.foil"), draftFoil ?? t("cardDetail.foilNone"), "foil"),
    ...(stampOptions.length > 0
      ? [attributePill("stamp", t("cardDetail.stamp"), draftStamp ?? t("cardDetail.stampNone"), "stamp")]
      : []),
    attributePill("condition", t("cardDetail.condition"), t(`cardDetail.conditions.${draftCondition}`), "condition"),
    attributePill("language", t("cardDetail.language"), LANGUAGE_LABELS[draftLanguage] ?? draftLanguage, "language"),
  ];

  const bottomActions = editing ? (
    <Button style={{ flex: 1 }} variant="secondary" label={t("common.cancel")} onPress={() => setEditing(false)} />
  ) : isDirty ? (
    <>
      <AppText size="xs" tone="secondary" style={{ flex: 1, alignSelf: "center" }}>
        {t("common.unsavedChanges")}
      </AppText>
      <Button variant="ghost" label={t("common.discard")} disabled={saveDraft.isPending} onPress={() => form.reset()} />
      <Button label={t("common.save")} loading={saveDraft.isPending} onPress={submitDraft} />
    </>
  ) : entry && reviewMode ? (
    <Button
      style={{ flex: 1 }}
      icon="check"
      label={nextScanId ? t("cardDetail.acceptNext") : t("cardDetail.acceptFinish")}
      loading={markCorrect.isPending}
      onPress={() => void acceptInReview()}
    />
  ) : entry && canConfirm ? (
    <Button
      style={{ flex: 1 }}
      icon="check"
      label={t("cardDetail.markCorrect")}
      loading={markCorrect.isPending}
      onPress={() => {
        setMatchesOpenState({ scanId, isOpen: false });
        markCorrect.mutate("confirm");
      }}
    />
  ) : null;

  const cardDetailSubtitle =
    storageReview && storageContext.data
      ? t("cardDetail.reviewProgress", { index: storageContext.data.index + 1, total: storageContext.data.total })
      : reviewMode && position.data
        ? t("cardDetail.reviewProgress", { index: position.data.index + 1, total: position.data.total })
        : card?.typeLine;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={editing ? t("cardDetail.correctCard") : undefined}
        subtitle={editing ? card?.name : undefined}
        actions={
          !editing && entry ? (
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {reviewMode ? (
                <IconButton icon="layout" accessibilityLabel={t("reviewGrid.layoutGrid")} onPress={showReviewGrid} />
              ) : null}
              {reviewMode ? null : (
                <IconButton icon="edit" accessibilityLabel={t("cardDetail.correctCard")} onPress={() => setEditing(true)} />
              )}
              <IconButton icon="trash" accessibilityLabel={t("cardDetail.remove")} onPress={removeWithUndo} />
              <IconButton icon="more" accessibilityLabel={t("cardDetail.actions")} onPress={() => setSheet("actions")} />
            </View>
          ) : !editing && position.isPending ? (
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {Array.from({ length: CARD_DETAIL_HEADER_ACTION_COUNT }).map((_, index) => (
                <Skeleton key={index} width={PAGE_HEADER_ICON_BUTTON_SIZE} height={PAGE_HEADER_ICON_BUTTON_SIZE} radius={RADIUS.full} />
              ))}
            </View>
          ) : null
        }
      />
      <PinnedActionsLayout actions={bottomActions} actionsDirection="row">
        {copyShareLink.isSuccess ? <Callout tone="success" title={t("cardDetail.shareLinkCopied")} /> : null}
        {copyShareLink.isError ? <Callout tone="destructive" title={t("cardDetail.shareLinkCopyFailed")} /> : null}
        {shareScanImage.isError ? <Callout tone="destructive" title={t("cardDetail.downloadPhotoFailed")} /> : null}
        {position.isError ? (
          <Callout
            tone="destructive"
            title={t("cardDetail.loadFailed")}
            action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void position.refetch()} />}
          />
        ) : null}
        {saveDraft.isError ? (
          <Callout
            tone="destructive"
            title={t("cardDetail.saveFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                loading={saveDraft.isPending}
                onPress={submitDraft}
              />
            }
          />
        ) : markCorrect.isError ? (
          <Callout
            tone="destructive"
            title={t("cardDetail.saveFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                loading={markCorrect.isPending}
                onPress={() => markCorrect.variables && markCorrect.mutate(markCorrect.variables)}
              />
            }
          />
        ) : null}
        {failedReviewAccept ? (
          <Callout
            tone="destructive"
            title={t("cardDetail.reviewAcceptFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                onPress={() => acceptInBackground.mutate(failedReviewAccept)}
              />
            }
          />
        ) : null}
        {toggleTag.isError ? (
          <Callout
            tone="destructive"
            title={t("cardTags.saveFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                loading={toggleTag.isPending}
                onPress={() => toggleTag.variables && toggleTag.mutate(toggleTag.variables)}
              />
            }
          />
        ) : null}
        {moveToLocation.isError ? (
          <Callout
            tone="destructive"
            title={t("storage.actionFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                loading={moveToLocation.isPending}
                onPress={() => moveToLocation.variables && moveToLocation.mutate(moveToLocation.variables)}
              />
            }
          />
        ) : null}
        {moveToCollection.isError ? (
          <Callout
            tone="destructive"
            title={t("storage.moveToCollectionFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                loading={moveToCollection.isPending}
                onPress={() => moveToCollection.variables && moveToCollection.mutate(moveToCollection.variables)}
              />
            }
          />
        ) : null}

        {editing && card ? (
          <CardCorrectionSearch
            collectionGuid={guid}
            initialQuery={card.name}
            disabled={correction.isPending}
            onSelect={(selected) => void applyCorrection(selected)}
          />
        ) : !card && position.isPending ? (
          <CardDetailSkeleton showsCapturedScan={showCaptured} />
        ) : (
          <>
            <CardDetailTitleBlock
              name={card?.name ?? t("cardDetail.fallbackTitle")}
              subtitle={cardDetailSubtitle}
              price={price}
            />
            {entry ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, alignItems: "center" }}>
                {!isReviewed && canConfirm ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
                {storage.data ? (
                  <PillButton
                    icon="storage"
                    label={`${storage.data.name} · ${t("storage.position", { position: storage.data.position })}`}
                    accessibilityRole="link"
                    accessibilityLabel={t("storage.storedIn", { name: storage.data.name, position: storage.data.position })}
                    onPress={() => {
                      router.back();
                      router.push({ pathname: "/storage/[guid]", params: { guid: storage.data?.guid ?? "" } });
                    }}
                  />
                ) : entry.binNumber != null ? (
                  <Pill icon="sorter" label={t("cards.bin", { number: entry.binNumber })} />
                ) : null}
                {scanAttributePills}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    tagsSet.length > 0
                      ? `${t("cardTags.edit")}: ${tagsSet.map((tag) => t(`cardTags.names.${tag}`)).join(", ")}`
                      : t("cardTags.edit")
                  }
                  accessibilityState={{ disabled: toggleTag.isPending }}
                  disabled={toggleTag.isPending}
                  onPress={() => setSheet("tags")}
                  style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACING.xs }}
                >
                  {tagsSet.length === 0 ? (
                    <Pill tone="neutral" label={t("cardTags.title")} />
                  ) : (
                    tagsSet.map((tag) =>
                      tag === "reviewed" ? (
                        <Pill key={tag} tone="success" icon="check" label={t(`cardTags.names.${tag}`)} />
                      ) : (
                        <Pill key={tag} tone="neutral" label={t(`cardTags.names.${tag}`)} />
                      ),
                    )
                  )}
                  <Icon name="expand" size={16} color={colors.foregroundSecondary} />
                </Pressable>
              </View>
            ) : null}

            {candidates.length > 1 ? (
              <View style={{ gap: SPACING.sm }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("cardDetail.similarMatchesCount", { count: candidates.length })}
                  accessibilityState={{ expanded: areMatchesOpen }}
                  onPress={() => setMatchesOpenState({ scanId, isOpen: !areMatchesOpen })}
                >
                  <SectionHeader
                    title={t("cardDetail.similarMatches")}
                    action={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
                        <Pill label={String(candidates.length)} />
                        <Icon name={areMatchesOpen ? "collapse" : "expand"} size={16} color={colors.foregroundSecondary} />
                      </View>
                    }
                  />
                </Pressable>
                {areMatchesOpen ? (
                  <>
                    {!isReviewed ? (
                      <AppText size="sm" tone="secondary">
                        {t("cardDetail.similarMatchesHint")}
                      </AppText>
                    ) : null}
                    <CandidateStrip
                      candidates={candidates}
                      selectedId={card?.id}
                      disabled={correction.isPending}
                      onSelect={(selected) => {
                        if (selected.id !== card?.id) void applyCorrection(selected);
                      }}
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" }}>
              {showCaptured ? (
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <AppText size="xs" tone="secondary">
                      {showsCapturedBackSide ? t("cardDetail.capturedBackSide") : t("cardDetail.capturedScan")}
                    </AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {capturedUrl ? (
                        <IconButton
                          icon="download"
                          variant="plain"
                          size={32}
                          disabled={shareScanImage.isPending}
                          accessibilityLabel={t("cardDetail.downloadPhoto")}
                          onPress={() =>
                            shareScanImage.mutate({
                              collectionGuid: guid,
                              scanId,
                              side: showsCapturedBackSide ? "back" : "front",
                              cardName: card?.name,
                            })
                          }
                        />
                      ) : null}
                      {capturedBackUrl ? (
                        <IconButton
                          icon="switchSides"
                          variant="plain"
                          size={32}
                          selected={showsCapturedBackSide}
                          accessibilityLabel={
                            showsCapturedBackSide ? t("cardDetail.showFrontSide") : t("cardDetail.showBackSide")
                          }
                          onPress={() => setBackSideScanId(showsCapturedBackSide ? null : scanId)}
                        />
                      ) : null}
                    </View>
                  </View>
                  <CardImageFrame>
                    {capturedUrl ? (
                      <Image
                        source={{ uri: capturedUrl }}
                        style={{ flex: 1 }}
                        contentFit="fill"
                        accessibilityLabel={
                          showsCapturedBackSide ? t("cardDetail.capturedBackSideAlt") : t("cardDetail.capturedScan")
                        }
                      />
                    ) : (
                      <Skeleton height="100%" radius={0} />
                    )}
                  </CardImageFrame>
                </View>
              ) : null}
              <CardDetailArt card={card} caption={showCaptured ? t("cardDetail.matchedCard") : undefined} />
            </View>

            {reviewMode && entry ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("cardDetail.correctCard")} />
                <CardCorrectionSearch
                  key={`${scanId}:${entry.card.id}`}
                  inline
                  collectionGuid={guid}
                  initialQuery={entry.card.name}
                  disabled={correction.isPending}
                  onSelect={(selected) => void applyCorrection(selected)}
                />
              </View>
            ) : null}

            {card ? (
              <CardDetailInfoSections
                card={card}
                binNumber={entry?.binNumber}
                isFoil={draftFoil != null}
                foilType={draftFoil}
                stamp={draftStamp}
                condition={draftCondition}
                priceExtras={
                  entry && acquisitionCost.data ? (
                    <PricePaidField
                      label={t("cardDetail.pricePaid", { currency: acquisitionCost.data.currency })}
                      placeholder={t("cardDetail.pricePaidEmpty")}
                      value={form.watch("acquisitionCost")}
                      onChange={(cost) => form.setValue("acquisitionCost", cost, { shouldDirty: true })}
                      error={
                        errors.acquisitionCost ? translateFormErrorMessage(t, errors.acquisitionCost.message) : undefined
                      }
                    />
                  ) : entry && billing.data?.businessTools && acquisitionCost.isLoading ? (
                    <PricePaidFieldSkeleton />
                  ) : null
                }
              />
            ) : null}

            {hasScanOrigin || entry?.binNumber != null || (entry && origin.isLoading) ? (
              <CollapsibleSection title={t("cardDetail.thisScan")}>
                {origin.data && hasScanOrigin ? (
                  <ListGroup>
                    {origin.data.scannedAt ? (
                      <ListRow
                        icon="clock"
                        title={t("cardDetail.scanOrigin.scannedAt")}
                        value={formatDateTime(origin.data.scannedAt, i18n.language)}
                      />
                    ) : null}
                    {origin.data.scannedBy ? (
                      <ListRow icon="account" title={t("cardDetail.scanOrigin.scannedBy")} value={origin.data.scannedBy.name} />
                    ) : null}
                    {origin.data.device ? (
                      <ListRow
                        icon="sorter"
                        title={t("cardDetail.scanOrigin.sorter")}
                        value={
                          origin.data.device.isDeleted
                            ? t("cardDetail.scanOrigin.deletedSorter", { name: origin.data.device.name })
                            : origin.data.device.name
                        }
                      />
                    ) : null}
                  </ListGroup>
                ) : null}
                {entry?.binNumber != null ? (
                  <Surface style={{ gap: SPACING.sm }}>
                    <AppText size="sm" weight="medium" tone="secondary">
                      {t("cardDetail.binLocation")}
                    </AppText>
                    <BinLocationDiagram binNumber={entry.binNumber} />
                  </Surface>
                ) : null}
              </CollapsibleSection>
            ) : null}

          </>
        )}
      </PinnedActionsLayout>

      <OptionSheet
        visible={sheet === "actions"}
        title={t("cardDetail.actions")}
        options={actionMenuOptions}
        selected={[]}
        onSelect={(value) => {
          if (value === CARD_DETAIL_SHARE_ACTION) {
            setSheet(null);
            copyShareLink.mutate(scanId);
            return;
          }
          setSheet(CARD_DETAIL_MENU_SHEETS.find((menuSheet) => menuSheet === value) ?? null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "foil"}
        title={t("cardDetail.foil")}
        options={[
          { value: "", label: t("cardDetail.foilNone") },
          ...foilOptions.map((type) => ({ value: type, label: type })),
        ]}
        selected={[draftFoil ?? ""]}
        onSelect={(value) => {
          form.setValue("foilType", value === "" ? null : value, { shouldDirty: true });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "stamp"}
        title={t("cardDetail.stamp")}
        options={[
          { value: "", label: t("cardDetail.stampNone") },
          ...stampOptions.map((option) => ({ value: option, label: option })),
        ]}
        selected={[draftStamp ?? ""]}
        onSelect={(value) => {
          form.setValue("stamp", value === "" ? null : value, { shouldDirty: true });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "condition"}
        title={t("cardDetail.condition")}
        options={CARD_CONDITIONS.map((value) => ({ value, label: t(`cardDetail.conditions.${value}`) }))}
        selected={[draftCondition]}
        onSelect={(value) => {
          form.setValue("condition", value as CardCondition, { shouldDirty: true });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "language"}
        title={t("cardDetail.language")}
        options={languageOptions.map((value) => ({ value, label: LANGUAGE_LABELS[value] ?? value }))}
        selected={[draftLanguage]}
        onSelect={(value) => {
          form.setValue("language", value, { shouldDirty: true });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "tags"}
        title={t("cardTags.title")}
        options={CARD_TAGS.map((tag) => ({ value: tag, label: t(`cardTags.names.${tag}`) }))}
        selected={tagsSet}
        onSelect={(value) => {
          setSheet(null);
          const tag = CARD_TAGS.find((candidate) => candidate === value);
          if (tag) toggleTag.mutate({ tag, enabled: !tagsSet.includes(tag) });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "collection"}
        title={t("storage.moveToCollection")}
        emptyMessage={t("cardDetail.noCollectionsToMoveTo")}
        options={targetCollections.map((target) => ({ value: target.guid, label: target.name }))}
        selected={[]}
        searchPlaceholder={t("storage.searchCollections")}
        onSelect={(targetCollectionGuid) => {
          setSheet(null);
          moveToCollection.mutate({ scanIds: [scanId], targetCollectionGuid });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "location"}
        title={t("storage.moveToLocation")}
        emptyMessage={t("cardDetail.noLocationsToMoveTo")}
        options={moveTargets.map((location) => ({ value: location.guid, label: location.name }))}
        selected={[]}
        searchPlaceholder={t("storage.searchLocations")}
        onSelect={(locationGuid) => {
          setSheet(null);
          moveToLocation.mutate(locationGuid);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
