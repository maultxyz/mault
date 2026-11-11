import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import {
  CARD_CONDITIONS,
  TRADE_OFFER_CARD_QUANTITY_MAX,
  isCardCondition,
  tradeOfferFormSchema,
  type TradeOfferFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { submitTradeOffer, tradeLinkInfoQueryOptions } from "@/features/trade-offers/api/public-trade";
import { useTradeDraft } from "@/features/trade-offers/api/use-trade-draft";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import {
  clearTradeCards,
  removeOfferedCard,
  startTradeDraft,
  toggleWantedCard,
  updateOfferedCard,
} from "@/features/trade-offers/lib/trade-draft";
import { useSession } from "@/lib/auth/session";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { OfferedTradeCard, TradeLinkRef } from "@/lib/interfaces/trade";

export default function TradeScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kind?: string; guid?: string; token?: string }>();
  const draft = useTradeDraft();
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
    resolver: zodResolver(tradeOfferFormSchema),
    defaultValues: { guestName: user?.name ?? "", guestContact: user?.email ?? "", guestNote: "" },
  });
  const [editingCard, setEditingCard] = useState<OfferedTradeCard | null>(null);
  const [sent, setSent] = useState(false);
  const offeredCount = draft.offered.reduce((sum, card) => sum + card.quantity, 0);
  const isReady = draft.wanted.length > 0 && draft.offered.length > 0;

  const send = useMutation({
    mutationFn: (values: TradeOfferFormValues) => {
      if (!link) throw new Error(t("trade.invalidLink"));
      return submitTradeOffer(link, {
        ...values,
        wantedScanIds: draft.wanted.map((card) => card.scanId),
        offered: draft.offered.map((card) => ({
          gameKey: card.gameKey,
          lang: card.lang,
          cardId: card.cardId,
          quantity: card.quantity,
          condition: card.condition,
          isFoil: card.isFoil,
        })),
      });
    },
    onSuccess: () => {
      clearTradeCards();
      form.setValue("guestNote", "");
      setSent(true);
      AccessibilityInfo.announceForAccessibility(t("trade.sent"));
    },
  });

  const editOffered = (action: string) => {
    const card = editingCard;
    setEditingCard(null);
    if (!card) return;
    if (action === "increase") {
      updateOfferedCard(card.key, { quantity: Math.min(card.quantity + 1, TRADE_OFFER_CARD_QUANTITY_MAX) });
    } else if (action === "decrease") {
      updateOfferedCard(card.key, { quantity: Math.max(card.quantity - 1, 1) });
    } else if (action === "foil") {
      updateOfferedCard(card.key, { isFoil: !card.isFoil });
    } else if (action === "remove") {
      removeOfferedCard(card.key);
    } else if (isCardCondition(action)) {
      updateOfferedCard(card.key, { condition: action });
    }
  };

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
        <PageSkeleton />
      </Screen>
    );
  }
  if (!info.data) {
    return (
      <Screen header={header}>
        <EmptyState icon="transfer" title={t("trade.invalidLink")} description={t("trade.invalidLinkDescription")} />
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
    <Screen header={header}>
      <AppText size="sm" tone="secondary">
        {t("trade.description", { source: info.data.name })}
      </AppText>
      {sent ? <Callout tone="success" title={t("trade.sent")} /> : null}
      {send.isError ? <Callout tone="destructive" title={send.error.message || t("trade.sendFailed")} /> : null}

      <Surface style={{ gap: SPACING.md }}>
        <AppText weight="semibold" accessibilityRole="header">
          {t("trade.detailsTitle")}
        </AppText>
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
              label={t("trade.contactLabel")}
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

      <Surface style={{ gap: SPACING.sm }}>
        <AppText weight="semibold" accessibilityRole="header">
          {t("trade.getTitle", { count: draft.wanted.length })}
        </AppText>
        <AppText size="xs" tone="secondary">
          {t("trade.getDescription", { source: info.data.name })}
        </AppText>
        {draft.wanted.map((card) => (
          <TradeCardRow
            key={card.scanId}
            name={card.card.name}
            subtitle={[card.card.setName, card.condition, card.isFoil ? (card.foilType ?? t("trade.foil")) : null]
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
        <Button
          variant="secondary"
          icon="search"
          label={draft.wanted.length === 0 ? t("trade.chooseCards") : t("trade.addMoreCards")}
          onPress={() => router.push("/trade/browse")}
        />
      </Surface>

      <Surface style={{ gap: SPACING.sm }}>
        <AppText weight="semibold" accessibilityRole="header">
          {t("trade.giveTitle", { count: offeredCount })}
        </AppText>
        <AppText size="xs" tone="secondary">
          {t("trade.giveDescription")}
        </AppText>
        {draft.offered.map((card) => (
          <TradeCardRow
            key={card.key}
            name={card.name}
            subtitle={[`×${card.quantity}`, card.condition, card.isFoil ? t("trade.foil") : null, card.setName]
              .filter(Boolean)
              .join(" · ")}
            imageUrl={card.imageUrl}
            accessibilityHint={t("trade.editCardHint")}
            onPress={() => setEditingCard(card)}
          />
        ))}
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="camera"
            label={t("trade.scanCards")}
            onPress={() => router.push("/trade/scan")}
          />
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="collections"
            label={t("trade.fromCollection")}
            onPress={() => router.push("/trade/collection")}
          />
        </View>
      </Surface>

      <View style={{ gap: SPACING.sm }}>
        <AppText size="sm" accessibilityLiveRegion="polite">
          {isReady
            ? t("trade.summary", { get: draft.wanted.length, give: offeredCount })
            : draft.wanted.length === 0
              ? t("trade.needGet")
              : t("trade.needGive")}
        </AppText>
        <Button
          size="lg"
          icon="send"
          label={t("trade.send")}
          disabled={!isReady}
          loading={send.isPending}
          onPress={form.handleSubmit((values) => {
            setSent(false);
            send.mutate(values);
          })}
        />
      </View>

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
          { value: "remove", label: t("trade.remove") },
        ]}
        selected={editingCard ? [editingCard.condition] : []}
        onSelect={editOffered}
        onClose={() => setEditingCard(null)}
      />
    </Screen>
  );
}
