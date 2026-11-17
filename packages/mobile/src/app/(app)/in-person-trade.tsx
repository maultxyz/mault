import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  IN_PERSON_TRADE_GIVEN_CARDS_MAX,
  IN_PERSON_TRADE_RECEIVED_CARDS_MAX,
  PRICE_SOURCE_FIELDS,
  TRADE_OFFER_CARD_QUANTITY_MAX,
  formatPrice,
  inPersonTradeBalance,
  inPersonTradeFormSchema,
  isCardCondition,
  ownedCardSearchSubtitle,
  parseTradeOfferCashInput,
  toTradeOfferCardOption,
  type InPersonTradeCashDirection,
  type InPersonTradeFormValues,
  type InPersonTradeQuoteRequest,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
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
  inPersonOwnedCardSearchQueryOptions,
  inPersonTradeQuoteQueryOptions,
  recordInPersonTrade,
} from "@/features/trade-offers/api/in-person-trades";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { TradeGuestBalance } from "@/features/trade-offers/components/trade-guest-balance";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePricing } from "@/hooks/use-pricing";
import { useActiveOrgId } from "@/hooks/use-org";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import {
  COLLECTION_CARDS_QUERY_ROOT,
  IN_PERSON_TRADE_SEARCH_MIN_LENGTH,
  TRADE_OFFERS_QUERY_KEY,
} from "@/lib/constants/trade-offers";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { OfferedTradeCard } from "@/lib/interfaces/trade";
import type { InPersonGivenTradeCard } from "@/lib/interfaces/trade-offers";

export default function InPersonTradeScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const orgId = useActiveOrgId();
  const { source: orgPriceSource } = usePricing();
  const collections = useQuery(collectionsQueryOptions(orgId));
  const [given, setGiven] = useState<InPersonGivenTradeCard[]>([]);
  const [received, setReceived] = useState<OfferedTradeCard[]>([]);
  const [receiveCollectionGuid, setReceiveCollectionGuid] = useState<string | null>(null);
  const [isCollectionSheetOpen, setIsCollectionSheetOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<OfferedTradeCard | null>(null);
  const [givenSearch, setGivenSearch] = useState("");
  const [receivedSearch, setReceivedSearch] = useState("");
  const debouncedGivenSearch = useDebouncedValue(givenSearch.trim(), SEARCH_DEBOUNCE_MS);
  const debouncedReceivedSearch = useDebouncedValue(receivedSearch.trim(), SEARCH_DEBOUNCE_MS);
  const receiveCollection = collections.data?.find((collection) => collection.guid === receiveCollectionGuid) ?? null;
  const ownedResults = useQuery(inPersonOwnedCardSearchQueryOptions(orgId, debouncedGivenSearch));
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
    price === undefined ? undefined : price == null ? t("trade.noPrice") : formatPrice(price, priceSource);
  const givenScanIds = new Set(given.map((card) => card.scanId));
  const ownedMatches =
    debouncedGivenSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH
      ? (ownedResults.data ?? []).filter((result) => !givenScanIds.has(result.scanId))
      : [];
  const catalogMatches =
    debouncedReceivedSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH && receiveCollection
      ? (catalogResults.data?.cards ?? []).map((card) => toTradeOfferCardOption(card, receiveCollection.game?.key ?? ""))
      : [];

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
      router.back();
    },
  });

  const editReceived = (action: string) => {
    const card = editingCard;
    setEditingCard(null);
    if (!card) return;
    const update = (patch: Partial<OfferedTradeCard>) =>
      setReceived((current) => current.map((item) => (item.key === card.key ? { ...item, ...patch } : item)));
    if (action === "increase") update({ quantity: Math.min(card.quantity + 1, TRADE_OFFER_CARD_QUANTITY_MAX) });
    else if (action === "decrease") update({ quantity: Math.max(card.quantity - 1, 1) });
    else if (action === "foil") update({ isFoil: !card.isFoil });
    else if (action === "remove") setReceived((current) => current.filter((item) => item.key !== card.key));
    else if (isCardCondition(action)) update({ condition: action });
  };

  return (
    <Screen header={<PageHeader title={t("tradeOffers.inPerson.title")} onBack={() => router.back()} />}>
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
        <SearchInput
          value={givenSearch}
          onChangeText={setGivenSearch}
          placeholder={t("tradeOffers.inPerson.searchOwnedLabel")}
          accessibilityLabel={t("tradeOffers.inPerson.searchOwnedLabel")}
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
                    if (given.length >= IN_PERSON_TRADE_GIVEN_CARDS_MAX) return;
                    setGiven((current) => [
                      ...current,
                      { scanId: result.scanId, name: result.cardName, subtitle, imageUrl: result.imageUrl },
                    ]);
                    setGivenSearch("");
                  }}
                />
              );
            })}
          </ListGroup>
        ) : debouncedGivenSearch.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH && !ownedResults.isFetching ? (
          <AppText size="xs" tone="secondary" accessibilityLiveRegion="polite">
            {t("tradeOffers.inPerson.noResults")}
          </AppText>
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
          title={t("tradeOffers.inPerson.getTitle", {
            count: received.reduce((sum, card) => sum + card.quantity, 0),
          })}
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
          <SearchInput
            value={receivedSearch}
            onChangeText={setReceivedSearch}
            placeholder={t("tradeOffers.inPerson.searchCatalog")}
            accessibilityLabel={t("tradeOffers.inPerson.searchCatalog")}
          />
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
                  if (received.length >= IN_PERSON_TRADE_RECEIVED_CARDS_MAX) return;
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
              <TradeCardRow
                key={card.key}
                name={card.name}
                subtitle={[`×${card.quantity}`, t(`trade.conditions.${card.condition}`), card.isFoil ? t("trade.foil") : null, card.setName]
                  .filter(Boolean)
                  .join(" · ")}
                imageUrl={card.imageUrl}
                value={rowPriceLabel(currentQuote?.offeredPrices[index])}
                accessibilityHint={t("tradeOffers.inPerson.editCardHint")}
                onPress={() => setEditingCard(card)}
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

      <View style={{ gap: SPACING.sm }}>
        <AppText size="sm" accessibilityLiveRegion="polite">
          {hasContent ? t("tradeOffers.inPerson.readyHint") : t("tradeOffers.inPerson.emptyHint")}
        </AppText>
        <Button
          size="lg"
          icon="check"
          label={t("tradeOffers.inPerson.record")}
          disabled={!hasContent || (received.length > 0 && !receiveCollection)}
          loading={record.isPending}
          onPress={form.handleSubmit((values) => record.mutate(values))}
        />
      </View>

      <OptionSheet
        visible={isCollectionSheetOpen}
        title={t("tradeOffers.inPerson.receiveCollection")}
        options={(collections.data ?? []).map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={receiveCollectionGuid ? [receiveCollectionGuid] : []}
        onSelect={(guid) => {
          setIsCollectionSheetOpen(false);
          if (guid !== receiveCollectionGuid) {
            setReceiveCollectionGuid(guid);
            setReceived([]);
            setReceivedSearch("");
          }
        }}
        onClose={() => setIsCollectionSheetOpen(false)}
      />
      <OptionSheet
        visible={!!editingCard}
        title={editingCard?.name ?? ""}
        options={[
          { value: "increase", label: t("trade.quantityIncrease", { count: (editingCard?.quantity ?? 1) + 1 }) },
          ...((editingCard?.quantity ?? 1) > 1
            ? [{ value: "decrease", label: t("trade.quantityDecrease", { count: (editingCard?.quantity ?? 2) - 1 }) }]
            : []),
          { value: "foil", label: editingCard?.isFoil ? t("trade.markNotFoil") : t("trade.markFoil") },
          ...CARD_CONDITIONS.map((condition) => ({
            value: condition,
            label: t("trade.conditionOption", { condition: t(`trade.conditions.${condition}`) }),
          })),
          { value: "remove", label: t("tradeOffers.inPerson.remove") },
        ]}
        selected={editingCard ? [editingCard.condition] : []}
        onSelect={editReceived}
        onClose={() => setEditingCard(null)}
      />
    </Screen>
  );
}
