import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  CARD_TAGS,
  cardTagsSetOn,
  type CardTag,
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
import { Pill } from "@/components/ui/pill";
import { SaveBar } from "@/components/ui/save-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardCorrection } from "@/features/cards/api/use-card-correction";
import { usePrefetchCardDetails } from "@/features/cards/api/use-prefetch-card-details";
import { BinLocationDiagram } from "@/features/cards/components/bin-location-diagram";
import { CandidateStrip } from "@/features/cards/components/candidate-strip";
import type { CardDetailSheet, MatchesOpenState } from "@/lib/interfaces/cards";
import type { IconName } from "@/lib/interfaces/ui";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { CardPurchaseLinks } from "@/features/cards/components/card-purchase-links";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { PricePaidField } from "@/features/cards/components/price-paid-field";
import { cardAcquisitionCostQueryOptions, setCardAcquisitionCost } from "@/features/business/api/card-cost";
import {
  cachedCollectionCardPosition,
  cardScanOriginQueryOptions,
  setCollectionCardTags,
  collectionCardQueryOptions,
  invalidateCollectionCards,
  removeCollectionCard,
  scanImageQueryOptions,
  updateCollectionCard,
} from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useMoveCardsToCollection } from "@/features/collections/api/use-move-cards-to-collection";
import { billingQueryOptions } from "@/features/org/api/billing";
import {
  cardStorageLocationQueryOptions,
  fetchFirstUnreviewedStorageCard,
  moveCardsToStorageLocation,
  storageLocationCardContextQueryOptions,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_DETAIL_MENU_SHEETS } from "@/lib/constants/cards";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { formatDateTime } from "@/lib/dates";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { CARD_ART_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
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
    mutationFn: async (values: ScanDraftFormValues) => {
      const { dirtyFields } = form.formState;
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
    onSuccess: (_, values) => form.reset(values),
    onSettled: () => {
      invalidateCollectionCards(queryClient, guid);
      void queryClient.invalidateQueries({ queryKey: cardAcquisitionCostQueryOptions(activeOrgId, scanId).queryKey });
    },
  });

  const markCorrect = useMutation({
    mutationFn: (kind: "confirm" | "review") =>
      updateCollectionCard(guid, scanId, kind === "confirm" ? { confirmed: true } : { reviewed: true }),
    onSettled: () => invalidateCollectionCards(queryClient, guid),
  });

  const acceptInBackground = useMutation({
    mutationFn: ({ kind, acceptedScanId }: { kind: "confirm" | "review"; acceptedScanId: string }) =>
      updateCollectionCard(guid, acceptedScanId, kind === "confirm" ? { confirmed: true } : { reviewed: true }),
    onSettled: () => invalidateCollectionCards(queryClient, guid),
    onError: (error) => Alert.alert(t("cardDetail.saveFailed"), error instanceof Error ? error.message : undefined),
  });

  const toggleTag = useMutation({
    mutationFn: (tag: CardTag) =>
      setCollectionCardTags(guid, { scanIds: [scanId], tags: [tag], enabled: !tagsSet.includes(tag) }),
    onSettled: () => invalidateCollectionCards(queryClient, guid),
    onError: (error) => Alert.alert(t("cardTags.saveFailed"), error instanceof Error ? error.message : undefined),
  });

  const remove = useMutation({
    mutationFn: () => removeCollectionCard(guid, scanId),
    onSuccess: () => {
      invalidateCollectionCards(queryClient, guid);
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      router.back();
    },
  });

  const { targetCollections, moveToCollection } = useMoveCardsToCollection({
    sourceCollectionGuid: guid,
    onMoved: () => router.back(),
  });

  const moveToLocation = useMutation({
    mutationFn: (locationGuid: string) => moveCardsToStorageLocation(locationGuid, [scanId]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      invalidateCollectionCards(queryClient, guid);
    },
    onError: (error) => Alert.alert(t("storage.actionFailed"), error instanceof Error ? error.message : undefined),
  });

  const actionMenuOptions = [
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

  const confirmRemove = () =>
    Alert.alert(t("cardDetail.removeConfirmTitle"), t("cardDetail.removeConfirmDescription"), [
      { text: t("cardDetail.cancel"), style: "cancel" },
      { text: t("cardDetail.remove"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  const attributePill = (icon: IconName, fieldLabel: string, value: string, menuSheet: CardDetailSheet) => (
    <Pressable
      key={menuSheet}
      accessibilityRole="button"
      accessibilityLabel={`${fieldLabel}: ${value}`}
      onPress={() => setSheet(menuSheet)}
    >
      <Pill icon={icon} label={value} />
    </Pressable>
  );
  const scanAttributePills = [
    attributePill("sparkles", t("cardDetail.foil"), draftFoil ?? t("cardDetail.foilNone"), "foil"),
    ...(stampOptions.length > 0
      ? [attributePill("stamp", t("cardDetail.stamp"), draftStamp ?? t("cardDetail.stampNone"), "stamp")]
      : []),
    attributePill("condition", t("cardDetail.condition"), t(`cardDetail.conditions.${draftCondition}`), "condition"),
    attributePill("language", t("cardDetail.language"), LANGUAGE_LABELS[draftLanguage] ?? draftLanguage, "language"),
  ];

  const imageFrame = {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: CARD_ART_RADIUS,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  };

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={editing ? t("cardDetail.correctCard") : (card?.name ?? t("cardDetail.fallbackTitle"))}
        subtitle={
          editing
            ? card?.name
            : storageReview && storageContext.data
              ? t("cardDetail.reviewProgress", {
                  index: storageContext.data.index + 1,
                  total: storageContext.data.total,
                })
              : reviewMode && position.data
              ? t("cardDetail.reviewProgress", { index: position.data.index + 1, total: position.data.total })
              : card?.typeLine
        }
        titleAccessory={
          !editing && price != null ? (
            <AppText size="lg" heading weight="bold" style={{ fontVariant: ["tabular-nums"] }}>
              {pricing.format(price)}
            </AppText>
          ) : null
        }
        onBack={editing ? () => setEditing(false) : undefined}
        actions={
          !editing && entry ? (
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {reviewMode ? (
                <IconButton icon="layout" accessibilityLabel={t("reviewGrid.layoutGrid")} onPress={showReviewGrid} />
              ) : null}
              {reviewMode ? null : (
                <IconButton icon="edit" accessibilityLabel={t("cardDetail.correctCard")} onPress={() => setEditing(true)} />
              )}
              <IconButton icon="trash" accessibilityLabel={t("cardDetail.remove")} onPress={confirmRemove} />
              <IconButton icon="more" accessibilityLabel={t("cardDetail.actions")} onPress={() => setSheet("actions")} />
            </View>
          ) : null
        }
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xl, gap: SPACING.xl }}
      >
        {position.isError ? <Callout tone="destructive" title={t("cardDetail.loadFailed")} /> : null}
        {remove.isError ? <Callout tone="destructive" title={t("cardDetail.removeFailed")} /> : null}
        {saveDraft.isError || markCorrect.isError ? (
          <Callout tone="destructive" title={t("cardDetail.saveFailed")} />
        ) : null}

        {editing && card ? (
          <CardCorrectionSearch
            collectionGuid={guid}
            initialQuery={card.name}
            disabled={correction.isPending}
            onSelect={(selected) => void applyCorrection(selected)}
          />
        ) : (
          <>
            {entry ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, alignItems: "center" }}>
                {!isReviewed && canConfirm ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
                {storage.data ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t("storage.storedIn", { name: storage.data.name, position: storage.data.position })}
                    onPress={() => {
                      router.back();
                      router.push({ pathname: "/storage/[guid]", params: { guid: storage.data?.guid ?? "" } });
                    }}
                  >
                    <Pill
                      icon="storage"
                      label={`${storage.data.name} · ${t("storage.position", { position: storage.data.position })}`}
                    />
                  </Pressable>
                ) : entry.binNumber != null ? (
                  <Pill icon="sorter" label={t("cards.bin", { number: entry.binNumber })} />
                ) : null}
                {scanAttributePills}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("cardTags.edit")}
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
                  <View style={imageFrame}>
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
                  </View>
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 6 }}>
                {showCaptured ? (
                  <AppText size="xs" tone="secondary">
                    {t("cardDetail.matchedCard")}
                  </AppText>
                ) : null}
                <View style={imageFrame}>
                  {card ? (
                    <Image
                      accessibilityLabel={card.name}
                      source={{ uri: absoluteUrl(card.image?.normal ?? card.image?.small) ?? undefined }}
                      style={{ flex: 1 }}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : null}
                </View>
              </View>
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
              <CollapsibleSection title={t("cardDetail.details")} initiallyOpen>
                <CardDetailsList card={card} binNumber={entry?.binNumber} />
              </CollapsibleSection>
            ) : position.isPending ? (
              <View style={{ gap: SPACING.sm }}>
                <Skeleton height={16} width="60%" />
                <Skeleton height={16} width="45%" />
                <Skeleton height={16} width="55%" />
              </View>
            ) : null}

            {card ? (
              <CollapsibleSection title={t("cardDetail.prices")} initiallyOpen>
                <CardPriceDetails
                  card={card}
                  isFoil={draftFoil != null}
                  foilType={draftFoil}
                  stamp={draftStamp}
                  condition={draftCondition}
                />
                <CardPurchaseLinks card={card} />
                {entry && acquisitionCost.data ? (
                  <PricePaidField
                    label={t("cardDetail.pricePaid", { currency: acquisitionCost.data.currency })}
                    placeholder={t("cardDetail.pricePaidEmpty")}
                    value={form.watch("acquisitionCost")}
                    onChange={(cost) => form.setValue("acquisitionCost", cost, { shouldDirty: true })}
                    error={
                      errors.acquisitionCost ? translateFormErrorMessage(t, errors.acquisitionCost.message) : undefined
                    }
                  />
                ) : null}
              </CollapsibleSection>
            ) : null}

            {hasScanOrigin || entry?.binNumber != null ? (
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
                  <View style={{ gap: SPACING.sm, marginTop: SPACING.sm }}>
                    <AppText size="sm" weight="medium" tone="secondary">
                      {t("cardDetail.binLocation")}
                    </AppText>
                    <BinLocationDiagram binNumber={entry.binNumber} />
                  </View>
                ) : null}
              </CollapsibleSection>
            ) : null}

          </>
        )}
      </ScrollView>

      {!editing && entry && !isDirty && (reviewMode || canConfirm) ? (
        <View
          style={{
            flexDirection: "row",
            gap: SPACING.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: SPACING.md,
            paddingBottom: SPACING.md + insets.bottom,
          }}
        >
          {reviewMode ? (
            <Button
              style={{ flex: 1 }}
              icon="check"
              label={nextScanId ? t("cardDetail.acceptNext") : t("cardDetail.acceptFinish")}
              loading={markCorrect.isPending}
              onPress={() => void acceptInReview()}
            />
          ) : (
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
          )}
        </View>
      ) : null}

      <SaveBar
        visible={isDirty}
        saving={saveDraft.isPending}
        onSave={form.handleSubmit((values) => saveDraft.mutate(values))}
        onDiscard={() => form.reset()}
      />

      <OptionSheet
        visible={sheet === "actions"}
        title={t("cardDetail.actions")}
        options={actionMenuOptions}
        selected={[]}
        onSelect={(value) => setSheet(CARD_DETAIL_MENU_SHEETS.find((menuSheet) => menuSheet === value) ?? null)}
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
          if (tag) toggleTag.mutate(tag);
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
