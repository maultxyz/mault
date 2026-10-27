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
import { BinLocationDiagram } from "@/features/cards/components/bin-location-diagram";
import { CandidateStrip } from "@/features/cards/components/candidate-strip";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { PricePaidField } from "@/features/cards/components/price-paid-field";
import { cardAcquisitionCostQueryOptions, setCardAcquisitionCost } from "@/features/business/api/card-cost";
import {
  cardScanOriginQueryOptions,
  collectionCardQueryOptions,
  invalidateCollectionCards,
  removeCollectionCard,
  scanImageQueryOptions,
  updateCollectionCard,
} from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { cardStorageLocationQueryOptions, storageLocationCardsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
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
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const position = useQuery(collectionCardQueryOptions(guid, scanId, reviewMode && !storageReview));
  const storageCards = useQuery({ ...storageLocationCardsQueryOptions(storageGuid ?? ""), enabled: storageReview });
  const image = useQuery(scanImageQueryOptions(guid, scanId));
  const origin = useQuery(cardScanOriginQueryOptions(guid, scanId));
  const hasScanOrigin = !!origin.data && (!!origin.data.scannedBy || !!origin.data.device);
  const storage = useQuery(cardStorageLocationQueryOptions(guid, scanId));
  const activeOrgId = useActiveOrgId();
  const collections = useQuery(collectionsQueryOptions(activeOrgId));
  const acquisitionCost = useQuery(cardAcquisitionCostQueryOptions(activeOrgId, scanId));
  const correction = useCardCorrection(guid);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<"foil" | "condition" | "language" | null>(null);

  const entry = position.data?.entry.scanId === scanId ? position.data.entry : null;
  const nextScanId = position.data?.nextScanId ?? null;
  const collection = collections.data?.find((c) => c.guid === guid);
  const foilOptions = collection?.game?.foilTypes?.length ? collection.game.foilTypes : [t("cardDetail.foil")];
  const card = entry?.card;
  const capturedUrl = absoluteUrl(image.data);
  const showCaptured = image.isPending || !!capturedUrl;
  const canConfirm = !!entry && (!!entry.lowConfidenceMatch || !!entry.alternativeMatches?.length) && !entry.corrected;
  const isReviewed = !!entry?.reviewed || !!entry?.corrected;

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
            foilType: entry.foilType ?? (entry.isFoil ? foilOptions[0] : null),
            condition: entry.condition ?? DEFAULT_CARD_CONDITION,
            language: scanLanguage(entry),
            acquisitionCost: acquisitionCost.data?.cost ?? null,
          }
        : undefined,
    [entry, foilOptions, acquisitionCost.data],
  );
  const form = useForm<ScanDraftFormValues>({
    resolver: zodResolver(scanDraftFormSchema),
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty, errors } = form.formState;
  const draftFoil = form.watch("foilType");
  const draftCondition = form.watch("condition") as CardCondition;
  const draftLanguage = form.watch("language");
  const languageOptions: string[] =
    !draftLanguage || isCardLanguage(draftLanguage) ? [...CARD_LANGUAGES] : [draftLanguage, ...CARD_LANGUAGES];
  const price = card ? pricing.priceOf(card, draftFoil != null, draftCondition) : null;

  const saveDraft = useMutation({
    mutationFn: async (values: ScanDraftFormValues) => {
      const { dirtyFields } = form.formState;
      if (dirtyFields.foilType || dirtyFields.condition || dirtyFields.language) {
        await updateCollectionCard(guid, scanId, {
          isFoil: values.foilType != null,
          foilType: values.foilType,
          condition: values.condition as CardCondition,
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

  const remove = useMutation({
    mutationFn: () => removeCollectionCard(guid, scanId),
    onSuccess: () => {
      invalidateCollectionCards(queryClient, guid);
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      router.back();
    },
  });

  usePreventRemove(isDirty && !saveDraft.isPending, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("cardDetail.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const goToNextInReview = async () => {
    if (storageReview && storageGuid) {
      const list = await queryClient
        .fetchQuery({ ...storageLocationCardsQueryOptions(storageGuid), staleTime: 0 })
        .catch(() => storageCards.data ?? []);
      const index = list.findIndex((c) => c.scanId === scanId);
      const pending = (c: (typeof list)[number]) => !c.reviewed && c.scanId !== scanId;
      const next = list.slice(index + 1).find(pending) ?? list.find(pending);
      if (next) {
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
    await correction.correct(entry, selected);
    setEditing(false);
    if (reviewMode) await goToNextInReview();
  };

  const acceptInReview = async () => {
    await markCorrect.mutateAsync(canConfirm ? "confirm" : "review");
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

  const imageFrame = {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: RADIUS.lg,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={editing ? t("cardDetail.correctCard") : (card?.name ?? t("cardDetail.fallbackTitle"))}
        subtitle={
          editing
            ? card?.name
            : storageReview && storageCards.data
              ? t("cardDetail.reviewProgress", {
                  index: storageCards.data.findIndex((c) => c.scanId === scanId) + 1,
                  total: storageCards.data.length,
                })
              : reviewMode && position.data
              ? t("cardDetail.reviewProgress", { index: position.data.index + 1, total: position.data.total })
              : card?.typeLine
        }
        onBack={editing ? () => setEditing(false) : () => router.back()}
        actions={
          !editing && entry ? (
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {reviewMode ? (
                <IconButton icon="layout" accessibilityLabel={t("reviewGrid.layoutGrid")} onPress={showReviewGrid} />
              ) : null}
              <IconButton icon="trash" accessibilityLabel={t("cardDetail.remove")} onPress={confirmRemove} />
            </View>
          ) : null
        }
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xl, gap: SPACING.xl }}
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
                {price != null ? (
                  <AppText size="2xl" heading weight="bold" style={{ fontVariant: ["tabular-nums"] }}>
                    {pricing.format(price)}
                  </AppText>
                ) : null}
                {draftFoil ? <Pill tone="info" label={draftFoil} /> : null}
                {isReviewed ? (
                  <Pill tone="success" icon="check" label={t("cardDetail.reviewed")} />
                ) : canConfirm ? (
                  <Pill tone="warning" label={t("cards.needsReview")} />
                ) : null}
              </View>
            ) : null}

            {candidates.length > 1 ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("cardDetail.similarMatches")} />
                <AppText size="sm" tone="secondary">
                  {t("cardDetail.similarMatchesHint")}
                </AppText>
                <CandidateStrip
                  candidates={candidates}
                  selectedId={card?.id}
                  disabled={correction.isPending}
                  onSelect={(selected) => {
                    if (selected.id !== card?.id) void applyCorrection(selected);
                  }}
                />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" }}>
              {showCaptured ? (
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText size="xs" tone="secondary">
                    {t("cardDetail.capturedScan")}
                  </AppText>
                  <View style={imageFrame}>
                    {capturedUrl ? (
                      <Image source={{ uri: capturedUrl }} style={{ flex: 1 }} contentFit="fill" />
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
                      source={{ uri: absoluteUrl(card.image?.normal ?? card.image?.small) ?? undefined }}
                      style={{ flex: 1 }}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : null}
                </View>
              </View>
            </View>

            {card ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("cardDetail.prices")} />
                <CardPriceDetails card={card} isFoil={draftFoil != null} />
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
              </View>
            ) : null}

            {card ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("cardDetail.details")} />
                <CardDetailsList card={card} binNumber={entry?.binNumber} />
                {entry ? (
                  <ListGroup>
                    <ListRow
                      icon="sparkles"
                      title={t("cardDetail.foil")}
                      value={draftFoil ?? t("cardDetail.foilNone")}
                      onPress={() => setSheet("foil")}
                    />
                    <ListRow
                      icon="condition"
                      title={t("cardDetail.condition")}
                      value={t(`cardDetail.conditions.${draftCondition}`)}
                      onPress={() => setSheet("condition")}
                    />
                    <ListRow
                      icon="language"
                      title={t("cardDetail.language")}
                      value={LANGUAGE_LABELS[draftLanguage] ?? draftLanguage}
                      onPress={() => setSheet("language")}
                    />
                  </ListGroup>
                ) : null}
                {storage.data ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: storage.data?.guid ?? "" } })}
                    style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginTop: SPACING.xs }}
                  >
                    <Icon name="storage" size={14} color={colors.primaryText} />
                    <AppText tone="primary">
                      {t("storage.storedIn", { name: storage.data.name, position: storage.data.position })}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : position.isPending ? (
              <View style={{ gap: SPACING.sm }}>
                <Skeleton height={16} width="60%" />
                <Skeleton height={16} width="45%" />
                <Skeleton height={16} width="55%" />
              </View>
            ) : null}

            {hasScanOrigin || entry?.binNumber != null ? (
              <View style={{ gap: SPACING.sm }}>
                <SectionHeader title={t("cardDetail.thisScan")} />
                {origin.data && hasScanOrigin ? (
                  <ListGroup>
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
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {!editing && entry && !isDirty ? (
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
            <>
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                icon="edit"
                label={t("cardDetail.correctCard")}
                onPress={() => setEditing(true)}
              />
              <Button
                style={{ flex: 1 }}
                icon="check"
                label={nextScanId ? t("cardDetail.acceptNext") : t("cardDetail.acceptFinish")}
                loading={markCorrect.isPending}
                onPress={() => void acceptInReview()}
              />
            </>
          ) : (
            <>
              {canConfirm ? (
                <Button
                  style={{ flex: 1 }}
                  variant="secondary"
                  icon="check"
                  label={t("cardDetail.markCorrect")}
                  loading={markCorrect.isPending}
                  onPress={() => markCorrect.mutate("confirm")}
                />
              ) : null}
              <Button
                style={{ flex: 1 }}
                icon="edit"
                label={t("cardDetail.correctCard")}
                onPress={() => setEditing(true)}
              />
            </>
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
    </View>
  );
}
