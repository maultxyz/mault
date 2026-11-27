import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { router, useFocusEffect, useNavigation, usePreventRemove } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import {
  DEFAULT_CARD_CONDITION,
  IN_PERSON_TRADE_GIVEN_CARDS_MAX,
  IN_PERSON_TRADE_RECEIVED_CARDS_MAX,
  PRICE_SOURCE_FIELDS,
  formatPrice,
  formatPriceInCurrency,
  inPersonTradeBalance,
  inPersonTradeFormSchema,
  ownedCardSearchSubtitle,
  parseTradeOfferCashInput,
  toTradeOfferCardOption,
  type InPersonTradeCashDirection,
  type InPersonTradeFormValues,
  type InPersonTradeQuoteRequest, MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  inPersonCatalogSearchQueryOptions,
  inPersonCollectionCardsQueryOptions,
  inPersonOwnedCardSearchQueryOptions,
  inPersonTradeQuoteQueryOptions,
  recordInPersonTrade,
} from "@/features/trade-offers/api/in-person-trades";
import { OfferedTradeCardDetailsSheet } from "@/features/trade-offers/components/offered-trade-card-details-sheet";
import { OfferedTradeCardRow } from "@/features/trade-offers/components/offered-trade-card-row";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { TradeGuestBalance } from "@/features/trade-offers/components/trade-guest-balance";
import { mergeReceivedTradeCards, takeInPersonScannedCards } from "@/features/trade-offers/lib/in-person-received-scans";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePricing } from "@/hooks/use-pricing";
import { useActiveOrgId } from "@/hooks/use-org";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import { IN_PERSON_RECEIVED_CARD_LIMITS, TRADE_SCAN_TARGET_IN_PERSON } from "@/lib/constants/trade";
import {
  COLLECTION_CARDS_QUERY_ROOT,
  IN_PERSON_GIVEN_ALL_COLLECTIONS,
  IN_PERSON_TRADE_SEARCH_MIN_LENGTH,
  TRADE_OFFERS_QUERY_KEY,
} from "@/lib/constants/trade-offers";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { OfferedTradeCard } from "@/lib/interfaces/trade";
import type { InPersonGivenTradeCard } from "@/lib/interfaces/trade-offers";

export default function InPersonTradeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const orgId = useActiveOrgId();
  const { source: orgPriceSource } = usePricing();
  const collections = useQuery(collectionsQueryOptions(orgId));
  const [given, setGiven] = useState<InPersonGivenTradeCard[]>([]);
  const [received, setReceived] = useState<OfferedTradeCard[]>([]);
  const [receiveCollectionGuid, setReceiveCollectionGuid] = useState<string | null>(null);
  const [isCollectionSheetOpen, setIsCollectionSheetOpen] = useState(false);
  const [editingCardKey, setEditingCardKey] = useState<string | null>(null);
  const editingCard = received.find((card) => card.key === editingCardKey) ?? null;
  const hasRecordedRef = useRef(false);
  const [givenSearch, setGivenSearch] = useState("");
  const [givenSourceGuid, setGivenSourceGuid] = useState(IN_PERSON_GIVEN_ALL_COLLECTIONS);
  const [isGivenSourceSheetOpen, setIsGivenSourceSheetOpen] = useState(false);
  const [receivedSearch, setReceivedSearch] = useState("");
  const debouncedGivenSearch = useDebouncedValue(givenSearch.trim(), SEARCH_DEBOUNCE_MS);
  const debouncedReceivedSearch = useDebouncedValue(receivedSearch.trim(), SEARCH_DEBOUNCE_MS);
  const receiveCollection = collections.data?.find((collection) => collection.guid === receiveCollectionGuid) ?? null;
  const givenSourceCollection = collections.data?.find((collection) => collection.guid === givenSourceGuid) ?? null;
  const isBrowsingGivenCollection = !!givenSourceCollection;
  const ownedResults = useQuery({
    ...inPersonOwnedCardSearchQueryOptions(orgId, debouncedGivenSearch),
    enabled: !!orgId && !isBrowsingGivenCollection && debouncedGivenSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH,
  });
  const givenCollectionCards = useInfiniteQuery(
    inPersonCollectionCardsQueryOptions(orgId, givenSourceCollection?.guid ?? null, debouncedGivenSearch),
  );
  const catalogResults = useQuery(inPersonCatalogSearchQueryOptions(receiveCollectionGuid, debouncedReceivedSearch));
  const form = useForm<InPersonTradeFormValues>({
    resolver: zodResolver(inPersonTradeFormSchema),
    defaultValues: { partnerName: "", partnerContact: "", note: "", cash: "", cashDirection: "received" },
  });
  const cashAmount = parseTradeOfferCashInput(form.watch("cash"));
  const cashDirection = form.watch("cashDirection");
  const quoteRequest = useMemo<InPersonTradeQuoteRequest>(
    () => ({
      givenScanIds: given.map((card) => card.scanId),
      ...(receiveCollectionGuid ? { receiveCollectionGuid } : {}),
      received: received.map((card) => ({
        cardId: card.cardId,
        quantity: card.quantity,
        condition: card.condition,
        isFoil: card.isFoil,
      })),
    }),
    [given, received, receiveCollectionGuid],
  );
  const quote = useQuery(inPersonTradeQuoteQueryOptions(orgId, quoteRequest));
  const currentQuote = quote.isPlaceholderData ? undefined : quote.data;
  const priceSource = quote.data?.priceSource ?? orgPriceSource;
  const hasContent = given.length > 0 || received.length > 0 || cashAmount != null;
  const balance =
    quote.data && hasContent
      ? inPersonTradeBalance(quote.data, cashAmount == null ? null : { amount: cashAmount, direction: cashDirection })
      : null;
  const rowPriceLabel = (price: number | null | undefined) =>
    price === undefined ? undefined : price == null ? MISSING_PRICE_TEXT : formatPrice(price, priceSource);
  const rowPriceAccessibilityLabel = (price: number | null | undefined) =>
    price === null ? t("trade.noPrice") : undefined;
  const givenScanIds = new Set(given.map((card) => card.scanId));
  const ownedMatches = (
    isBrowsingGivenCollection
      ? (givenCollectionCards.data?.pages.flat() ?? [])
      : debouncedGivenSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH
        ? (ownedResults.data ?? [])
        : []
  ).filter((result) => !givenScanIds.has(result.scanId));
  const givenSearchAnswered = isBrowsingGivenCollection
    ? givenCollectionCards.isSuccess && !givenCollectionCards.isFetching
    : debouncedGivenSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH && !ownedResults.isFetching;
  const givenSearchLabel = isBrowsingGivenCollection
    ? t("tradeOffers.inPerson.filterCollectionLabel")
    : t("tradeOffers.inPerson.searchOwnedLabel");
  const catalogMatches =
    debouncedReceivedSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH && receiveCollection
      ? (catalogResults.data?.cards ?? []).map((card) => toTradeOfferCardOption(card, receiveCollection.game?.key ?? ""))
      : [];

  const updateReceived = (key: string, patch: Partial<OfferedTradeCard>) =>
    setReceived((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const announceCardLimit = useCallback(
    (limit: number) =>
      showToast({ message: t("tradeOffers.inPerson.cardLimitReached", { count: limit }), tone: "destructive" }),
    [showToast, t],
  );
  const receivedRef = useRef(received);
  receivedRef.current = received;

  useFocusEffect(
    useCallback(() => {
      const scannedCards = takeInPersonScannedCards();
      if (scannedCards.length === 0) return;
      const merged = mergeReceivedTradeCards(receivedRef.current, scannedCards, IN_PERSON_RECEIVED_CARD_LIMITS, () =>
        Crypto.randomUUID(),
      );
      setReceived(merged.cards);
      if (merged.droppedCount > 0) announceCardLimit(IN_PERSON_TRADE_RECEIVED_CARDS_MAX);
    }, [announceCardLimit]),
  );
  useEffect(() => () => void takeInPersonScannedCards(), []);

  const record = useMutation({
    mutationFn: ({ cash, ...values }: InPersonTradeFormValues) => {
      const parsedCash = parseTradeOfferCashInput(cash);
      return recordInPersonTrade({
        ...values,
        ...quoteRequest,
        ...(parsedCash != null ? { cashAmount: parsedCash } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [COLLECTION_CARDS_QUERY_ROOT] });
      AccessibilityInfo.announceForAccessibility(t("tradeOffers.inPerson.recorded"));
      showToast({ message: t("tradeOffers.inPerson.recorded"), tone: "success" });
      hasRecordedRef.current = true;
      router.back();
    },
  });

  usePreventRemove((hasContent || form.formState.isDirty) && !record.isPending, ({ data }) => {
    if (hasRecordedRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(t("common.discardTitle"), t("tradeOffers.inPerson.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const receivedCount = received.reduce((sum, card) => sum + card.quantity, 0);
  const confirmRecord = (values: InPersonTradeFormValues) => {
    const summaryLines = [
      t("tradeOffers.inPerson.confirmCards", { give: given.length, get: receivedCount }),
      ...(cashAmount != null
        ? [
            t(
              cashDirection === "received"
                ? "tradeOffers.inPerson.confirmCashReceived"
                : "tradeOffers.inPerson.confirmCashGiven",
              { amount: formatPriceInCurrency(cashAmount, PRICE_SOURCE_FIELDS[priceSource].currency) },
            ),
          ]
        : []),
      t("tradeOffers.inPerson.confirmDescription"),
    ];
    Alert.alert(t("tradeOffers.inPerson.confirmTitle"), summaryLines.join("\n\n"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("tradeOffers.inPerson.record"), onPress: () => record.mutate(values) },
    ]);
  };

  const chooseReceiveCollection = (guid: string) => {
    setReceiveCollectionGuid(guid);
    setReceived([]);
    setReceivedSearch("");
  };

  return (
    <Screen
      header={<PageHeader title={t("tradeOffers.inPerson.title")} onBack={() => router.back()} />}
      footer={
        <>
          <AppText size="sm" accessibilityLiveRegion="polite">
            {hasContent ? t("tradeOffers.inPerson.readyHint") : t("tradeOffers.inPerson.emptyHint")}
          </AppText>
          <Button
            size="lg"
            icon="check"
            label={t("tradeOffers.inPerson.record")}
            disabled={!hasContent || (received.length > 0 && !receiveCollection)}
            loading={record.isPending}
            onPress={form.handleSubmit(confirmRecord)}
          />
        </>
      }
    >
      <AppText size="sm" tone="secondary">
        {t("tradeOffers.inPerson.description")}
      </AppText>
      {record.isError ? (
        <Callout tone="destructive" title={record.error.message || t("tradeOffers.inPerson.recordFailed")} />
      ) : null}

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("tradeOffers.inPerson.detailsTitle")} />
        <Surface style={{ gap: SPACING.md }}>
          <Controller
            control={form.control}
            name="partnerName"
            render={({ field, fieldState }) => (
              <TextField
                label={t("tradeOffers.inPerson.partnerName")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="partnerContact"
            render={({ field, fieldState }) => (
              <TextField
                label={t("tradeOffers.inPerson.partnerContact")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="none"
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="note"
            render={({ field, fieldState }) => (
              <TextField
                label={t("trade.noteLabel")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                multiline
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
        </Surface>
      </View>

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("tradeOffers.inPerson.giveTitle", { count: given.length })} />
        <AppText size="xs" tone="secondary">
          {t("tradeOffers.inPerson.giveDescription")}
        </AppText>
        <SelectField
          label={t("tradeOffers.inPerson.giveSource")}
          value={givenSourceCollection?.name ?? t("tradeOffers.inPerson.allCollections")}
          onPress={() => setIsGivenSourceSheetOpen(true)}
        />
        <SearchInput
          value={givenSearch}
          onChangeText={setGivenSearch}
          placeholder={givenSearchLabel}
          accessibilityLabel={givenSearchLabel}
        />
        {ownedMatches.length > 0 ? (
          <ListGroup>
            {ownedMatches.map((result) => {
              const subtitle = ownedCardSearchSubtitle(result, t("trade.foil"));
              return (
                <TradeCardRow
                  key={result.scanId}
                  name={result.cardName}
                  subtitle={subtitle}
                  imageUrl={result.imageUrl}
                  accessibilityHint={t("trade.tapToAdd")}
                  onPress={() => {
                    if (given.length >= IN_PERSON_TRADE_GIVEN_CARDS_MAX) {
                      announceCardLimit(IN_PERSON_TRADE_GIVEN_CARDS_MAX);
                      return;
                    }
                    setGiven((current) => [
                      ...current,
                      { scanId: result.scanId, name: result.cardName, subtitle, imageUrl: result.imageUrl },
                    ]);
                    if (!isBrowsingGivenCollection) setGivenSearch("");
                  }}
                />
              );
            })}
          </ListGroup>
        ) : givenSearchAnswered ? (
          <AppText size="xs" tone="secondary" accessibilityLiveRegion="polite">
            {isBrowsingGivenCollection && !debouncedGivenSearch
              ? t("tradeOffers.inPerson.noCollectionCards")
              : t("tradeOffers.inPerson.noResults")}
          </AppText>
        ) : null}
        {isBrowsingGivenCollection && givenCollectionCards.hasNextPage ? (
          <Button
            variant="secondary"
            label={t("tradeOffers.inPerson.loadMoreCards")}
            loading={givenCollectionCards.isFetchingNextPage}
            onPress={() => void givenCollectionCards.fetchNextPage()}
          />
        ) : null}
        {given.length > 0 ? (
          <ListGroup>
            {given.map((card, index) => (
              <TradeCardRow
                key={card.scanId}
                name={card.name}
                subtitle={card.subtitle}
                imageUrl={card.imageUrl}
                value={rowPriceLabel(currentQuote?.wantedPrices[index])}
                valueAccessibilityLabel={rowPriceAccessibilityLabel(currentQuote?.wantedPrices[index])}
                right={
                  <IconButton
                    icon="trash"
                    variant="plain"
                    accessibilityLabel={t("trade.removeCard", { name: card.name })}
                    onPress={() => setGiven((current) => current.filter((item) => item.scanId !== card.scanId))}
                  />
                }
              />
            ))}
          </ListGroup>
        ) : (
          <AppText size="xs" tone="secondary">
            {t("tradeOffers.inPerson.giveEmpty")}
          </AppText>
        )}
      </View>

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader
          title={t("tradeOffers.inPerson.getTitle", { count: receivedCount })}
        />
        <AppText size="xs" tone="secondary">
          {t("tradeOffers.inPerson.getDescription")}
        </AppText>
        <SelectField
          label={t("tradeOffers.inPerson.receiveCollection")}
          value={receiveCollection?.name ?? null}
          placeholder={t("tradeOffers.inPerson.receiveCollectionPlaceholder")}
          onPress={() => setIsCollectionSheetOpen(true)}
        />
        {receiveCollection ? (
          <>
            <ListGroup>
              <ListRow
                icon="camera"
                title={t("tradeOffers.inPerson.scanReceived")}
                onPress={() =>
                  router.push({
                    pathname: "/trade/scan",
                    params: { target: TRADE_SCAN_TARGET_IN_PERSON, collectionGuid: receiveCollection.guid },
                  })
                }
              />
            </ListGroup>
            <SearchInput
              value={receivedSearch}
              onChangeText={setReceivedSearch}
              placeholder={t("tradeOffers.inPerson.searchCatalog")}
              accessibilityLabel={t("tradeOffers.inPerson.searchCatalog")}
            />
          </>
        ) : null}
        {catalogMatches.length > 0 ? (
          <ListGroup>
            {catalogMatches.map((option) => (
              <TradeCardRow
                key={option.cardId}
                name={option.name}
                subtitle={[option.setName || option.setCode.toUpperCase(), option.collectorNumber ? `#${option.collectorNumber}` : null]
                  .filter(Boolean)
                  .join(" · ")}
                imageUrl={option.imageUrl}
                accessibilityHint={t("trade.tapToAdd")}
                onPress={() => {
                  if (received.length >= IN_PERSON_TRADE_RECEIVED_CARDS_MAX) {
                    announceCardLimit(IN_PERSON_TRADE_RECEIVED_CARDS_MAX);
                    return;
                  }
                  setReceived((current) => [
                    ...current,
                    { ...option, key: Crypto.randomUUID(), quantity: 1, condition: DEFAULT_CARD_CONDITION, isFoil: false },
                  ]);
                  setReceivedSearch("");
                }}
              />
            ))}
          </ListGroup>
        ) : debouncedReceivedSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH &&
          receiveCollection &&
          !catalogResults.isFetching ? (
          <AppText size="xs" tone="secondary" accessibilityLiveRegion="polite">
            {t("tradeOffers.inPerson.noResults")}
          </AppText>
        ) : null}
        {received.length > 0 ? (
          <ListGroup>
            {received.map((card, index) => (
              <OfferedTradeCardRow
                key={card.key}
                card={card}
                value={rowPriceLabel(currentQuote?.offeredPrices[index])}
                valueAccessibilityLabel={rowPriceAccessibilityLabel(currentQuote?.offeredPrices[index])}
                onQuantityChange={(quantity) => updateReceived(card.key, { quantity })}
                onEditDetails={() => setEditingCardKey(card.key)}
                onRemove={() => setReceived((current) => current.filter((item) => item.key !== card.key))}
              />
            ))}
          </ListGroup>
        ) : (
          <AppText size="xs" tone="secondary">
            {receiveCollection ? t("tradeOffers.inPerson.getEmpty") : t("tradeOffers.inPerson.pickCollectionFirst")}
          </AppText>
        )}
      </View>

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("tradeOffers.inPerson.cashTitle")} />
        <Surface style={{ gap: SPACING.md }}>
          <Controller
            control={form.control}
            name="cashDirection"
            render={({ field }) => (
              <SegmentedControl<InPersonTradeCashDirection>
                options={[
                  { value: "received", label: t("tradeOffers.inPerson.cashReceived") },
                  { value: "given", label: t("tradeOffers.inPerson.cashGiven") },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="cash"
            render={({ field, fieldState }) => (
              <TextField
                label={t("trade.cashLabel", { currency: PRICE_SOURCE_FIELDS[priceSource].currency })}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
        </Surface>
      </View>

      {balance ? (
        <TradeGuestBalance
          balance={balance}
          priceSource={priceSource}
          isUpdating={quote.isPlaceholderData || quote.isFetching}
        />
      ) : null}

      <OptionSheet
        visible={isGivenSourceSheetOpen}
        title={t("tradeOffers.inPerson.giveSource")}
        options={[
          { value: IN_PERSON_GIVEN_ALL_COLLECTIONS, label: t("tradeOffers.inPerson.allCollections") },
          ...(collections.data ?? []).map((collection) => ({ value: collection.guid, label: collection.name })),
        ]}
        selected={[givenSourceGuid]}
        onSelect={(guid) => {
          setIsGivenSourceSheetOpen(false);
          if (guid !== givenSourceGuid) {
            setGivenSourceGuid(guid);
            setGivenSearch("");
          }
        }}
        onClose={() => setIsGivenSourceSheetOpen(false)}
      />
      <OptionSheet
        visible={isCollectionSheetOpen}
        title={t("tradeOffers.inPerson.receiveCollection")}
        options={(collections.data ?? []).map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={receiveCollectionGuid ? [receiveCollectionGuid] : []}
        onSelect={(guid) => {
          setIsCollectionSheetOpen(false);
          if (guid === receiveCollectionGuid) return;
          if (received.length === 0) {
            chooseReceiveCollection(guid);
            return;
          }
          Alert.alert(
            t("tradeOffers.inPerson.changeCollectionTitle"),
            t("tradeOffers.inPerson.changeCollectionDescription", { count: receivedCount }),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("tradeOffers.inPerson.changeCollectionConfirm"),
                style: "destructive",
                onPress: () => chooseReceiveCollection(guid),
              },
            ],
          );
        }}
        onClose={() => setIsCollectionSheetOpen(false)}
      />
      <OfferedTradeCardDetailsSheet
        card={editingCard}
        onToggleFoil={(card) => updateReceived(card.key, { isFoil: !card.isFoil })}
        onConditionChange={(card, condition) => updateReceived(card.key, { condition })}
        onClose={() => setEditingCardKey(null)}
      />
    </Screen>
  );
}
