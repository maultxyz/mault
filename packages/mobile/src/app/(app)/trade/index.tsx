import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  formatPrice,
  formatPriceInCurrency,
  parseTradeOfferCashInput,
  tradeOfferFormSchemaFor,
  tradeOfferGuestBalance,
  type TradeOfferFormValues,
  type TradeOfferQuoteRequest, MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSkeleton } from "@/components/ui/form-skeleton";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { MultilineFieldSkeleton } from "@/components/ui/multiline-field-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import {
  submitTradeOffer,
  tradeLinkInfoQueryOptions,
  tradeOfferQuoteQueryOptions,
} from "@/features/trade-offers/api/public-trade";
import { useTradeDraft } from "@/features/trade-offers/api/use-trade-draft";
import { OfferedTradeCardDetailsSheet } from "@/features/trade-offers/components/offered-trade-card-details-sheet";
import { OfferedTradeCardRow } from "@/features/trade-offers/components/offered-trade-card-row";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { TradeGuestBalance } from "@/features/trade-offers/components/trade-guest-balance";
import {
  clearTradeCards,
  removeOfferedCard,
  startTradeDraft,
  toOfferedCardInput,
  toggleWantedCard,
  updateOfferedCard,
} from "@/features/trade-offers/lib/trade-draft";
import { isInvalidLinkError } from "@/features/trade-offers/lib/link-errors";
import { useSession } from "@/lib/auth/session";
import { TRADE_OFFERS_SENT_BOX } from "@/lib/constants/trade";
import { FONT_SIZE, SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { TradeLinkRef } from "@/lib/interfaces/trade";

export default function TradeScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kind?: string; guid?: string; token?: string }>();
  const draft = useTradeDraft();
  const { showToast } = useToast();
  const routeLink = useMemo<TradeLinkRef | null>(
    () =>
      (params.kind === "collection" || params.kind === "storage") && params.guid && params.token
        ? { kind: params.kind, guid: params.guid, token: params.token }
        : null,
    [params.kind, params.guid, params.token],
  );
  useEffect(() => {
    if (routeLink) startTradeDraft(routeLink);
  }, [routeLink]);
  const link = routeLink ?? draft.link;
  const info = useQuery({
    ...tradeLinkInfoQueryOptions(link ?? { kind: "collection", guid: "", token: "" }),
    enabled: !!link,
  });
  const { user } = useSession();
  const form = useForm<TradeOfferFormValues>({
    resolver: zodResolver(tradeOfferFormSchemaFor(info.data?.requiresGuestContact !== false)),
    defaultValues: {
      guestName: user?.name ?? "",
      guestContact: user?.email ?? "",
      guestNote: "",
      offeredCash: "",
    },
  });
  const [editingCardKey, setEditingCardKey] = useState<string | null>(null);
  const editingCard = draft.offered.find((card) => card.key === editingCardKey) ?? null;
  const offeredCount = draft.offered.reduce((sum, card) => sum + card.quantity, 0);
  const offeredCash = parseTradeOfferCashInput(form.watch("offeredCash"));
  const isReady = draft.wanted.length > 0;
  const cashCurrency = info.data?.cashCurrency ?? "";
  const showsPrices = info.data?.showsPrices === true;
  const quoteRequest = useMemo<TradeOfferQuoteRequest>(
    () => ({
      wantedScanIds: draft.wanted.map((card) => card.scanId),
      offered: draft.offered.map(toOfferedCardInput),
    }),
    [draft.wanted, draft.offered],
  );
  const quote = useQuery({
    ...tradeOfferQuoteQueryOptions(link ?? { kind: "collection", guid: "", token: "" }, quoteRequest, showsPrices),
    enabled: !!link && showsPrices && (quoteRequest.wantedScanIds.length > 0 || quoteRequest.offered.length > 0),
  });
  const currentQuote = quote.isPlaceholderData ? undefined : quote.data;
  const balance =
    showsPrices && quote.data && (draft.wanted.length > 0 || draft.offered.length > 0)
      ? tradeOfferGuestBalance(quote.data, offeredCash)
      : null;
  const rowPriceLabel = (price: number | null | undefined) =>
    price === undefined || !info.data
      ? undefined
      : price == null
        ? MISSING_PRICE_TEXT
        : formatPrice(price, info.data.priceSource);
  const rowPriceAccessibilityLabel = (price: number | null | undefined) =>
    price === null && info.data ? t("trade.noPrice") : undefined;
  const summary =
    draft.offered.length === 0 && offeredCash == null
      ? t("trade.summaryNothing", { get: draft.wanted.length })
      : offeredCash == null
        ? t("trade.summary", { get: draft.wanted.length, give: offeredCount })
        : t("trade.summaryWithCash", {
            get: draft.wanted.length,
            give: offeredCount,
            cash: formatPriceInCurrency(offeredCash, cashCurrency),
          });

  const send = useMutation({
    mutationFn: ({ offeredCash: offeredCashInput, ...values }: TradeOfferFormValues) => {
      if (!link) throw new Error(t("trade.invalidLink"));
      const offeredCashAmount = parseTradeOfferCashInput(offeredCashInput);
      return submitTradeOffer(link, {
        ...values,
        ...(offeredCashAmount != null ? { offeredCashAmount } : {}),
        ...quoteRequest,
      });
    },
    onSuccess: () => {
      clearTradeCards();
      form.setValue("guestNote", "");
      form.setValue("offeredCash", "");
      showToast({ message: t("trade.sent"), tone: "success" });
      router.navigate({ pathname: "/collections", params: { view: "trades", box: TRADE_OFFERS_SENT_BOX } });
    },
  });

  const header = (
    <PageHeader title={t("trade.title")} subtitle={info.data?.name} onBack={() => router.back()} />
  );

  if (!link) {
    return (
      <Screen header={header}>
        <EmptyState icon="transfer" title={t("trade.invalidLink")} />
      </Screen>
    );
  }
  if (info.isLoading) {
    return (
      <Screen header={header}>
        <Skeleton width="80%" height={FONT_SIZE.sm} />
        <SectionSkeleton>
          <Surface style={{ gap: SPACING.md }}>
            <FormSkeleton fields={2} />
            <MultilineFieldSkeleton />
          </Surface>
        </SectionSkeleton>
        <SectionSkeleton hasDescription>
          <ListSkeleton rows={1} hasTrailing={false} />
        </SectionSkeleton>
        <SectionSkeleton hasDescription>
          <ListSkeleton rows={2} hasTrailing={false} />
        </SectionSkeleton>
      </Screen>
    );
  }
  if (!info.data) {
    return (
      <Screen header={header} onRefresh={() => info.refetch()}>
        {info.isError && !isInvalidLinkError(info.error) ? (
          <QueryErrorState
            title={t("trade.linkLoadFailed")}
            onRetry={() => void info.refetch()}
            isRetrying={info.isFetching}
          />
        ) : (
          <EmptyState icon="transfer" title={t("trade.invalidLink")} description={t("trade.invalidLinkDescription")} />
        )}
      </Screen>
    );
  }
  if (info.data.purpose !== "trade") {
    return (
      <Screen header={header}>
        <EmptyState icon="transfer" title={t("trade.notTradeLink")} description={t("trade.notTradeLinkDescription")} />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <>
          <AppText size="sm" accessibilityLiveRegion="polite">
            {isReady ? summary : t("trade.needGet")}
          </AppText>
          <Button
            size="lg"
            icon="send"
            label={t("trade.send")}
            disabled={!isReady}
            loading={send.isPending}
            onPress={form.handleSubmit((values) => send.mutate(values))}
          />
        </>
      }
    >
      <AppText size="sm" tone="secondary">
        {t("trade.description", { source: info.data.name })}
      </AppText>
      {send.isError ? <Callout tone="destructive" title={send.error.message || t("trade.sendFailed")} /> : null}

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("trade.detailsTitle")} />
        <Surface style={{ gap: SPACING.md }}>
          <Controller
            control={form.control}
            name="guestName"
            render={({ field, fieldState }) => (
              <TextField
                label={t("trade.nameLabel")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoComplete="name"
                textContentType="name"
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="guestContact"
            render={({ field, fieldState }) => (
              <TextField
                label={
                  info.data?.requiresGuestContact === false
                    ? t("trade.contactLabelOptional")
                    : t("trade.contactLabel")
                }
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
            name="guestNote"
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
        <SectionHeader title={t("trade.getTitle", { count: draft.wanted.length })} />
        <AppText size="xs" tone="secondary">
          {t("trade.getDescription", { source: info.data.name })}
        </AppText>
        <ListGroup>
          {draft.wanted.map((card, index) => (
            <TradeCardRow
              key={card.scanId}
              value={rowPriceLabel(currentQuote?.wantedPrices[index])}
              valueAccessibilityLabel={rowPriceAccessibilityLabel(currentQuote?.wantedPrices[index])}
              name={card.card.name}
              subtitle={[card.card.setName, t(`trade.conditions.${card.condition}`), card.isFoil ? (card.foilType ?? t("trade.foil")) : null]
                .filter(Boolean)
                .join(" · ")}
              imageUrl={card.card.image?.small ?? card.card.image?.normal ?? null}
              right={
                <IconButton
                  icon="trash"
                  variant="plain"
                  accessibilityLabel={t("trade.removeCard", { name: card.card.name })}
                  onPress={() => toggleWantedCard(card)}
                />
              }
            />
          ))}
          <ListRow
            icon="search"
            title={draft.wanted.length === 0 ? t("trade.chooseCards") : t("trade.addMoreCards")}
            onPress={() => router.push("/trade/browse")}
          />
        </ListGroup>
      </View>

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("trade.giveTitle", { count: offeredCount })} />
        <AppText size="xs" tone="secondary">
          {t("trade.giveDescription")}
        </AppText>
        <ListGroup>
          {draft.offered.map((card, index) => (
            <OfferedTradeCardRow
              key={card.key}
              card={card}
              value={rowPriceLabel(currentQuote?.offeredPrices[index])}
              valueAccessibilityLabel={rowPriceAccessibilityLabel(currentQuote?.offeredPrices[index])}
              onQuantityChange={(quantity) => updateOfferedCard(card.key, { quantity })}
              onEditDetails={() => setEditingCardKey(card.key)}
              onRemove={() => removeOfferedCard(card.key)}
            />
          ))}
          <ListRow icon="camera" title={t("trade.scanCards")} onPress={() => router.push("/trade/scan")} />
          <ListRow icon="collections" title={t("trade.fromCollection")} onPress={() => router.push("/trade/collection")} />
        </ListGroup>
        <Surface style={{ gap: SPACING.xs }}>
          <Controller
            control={form.control}
            name="offeredCash"
            render={({ field, fieldState }) => (
              <TextField
                label={t("trade.cashLabel", { currency: cashCurrency })}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <AppText size="xs" tone="secondary">
            {t("trade.cashHint")}
          </AppText>
        </Surface>
      </View>

      {balance && info.data ? (
        <TradeGuestBalance
          balance={balance}
          priceSource={info.data.priceSource}
          isUpdating={quote.isPlaceholderData || quote.isFetching}
        />
      ) : null}

      <OfferedTradeCardDetailsSheet
        card={editingCard}
        onToggleFoil={(card) => updateOfferedCard(card.key, { isFoil: !card.isFoil })}
        onConditionChange={(card, condition) => updateOfferedCard(card.key, { condition })}
        onClose={() => setEditingCardKey(null)}
      />
    </Screen>
  );
}
