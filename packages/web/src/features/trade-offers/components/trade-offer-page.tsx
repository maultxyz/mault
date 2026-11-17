import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  rememberGuestName,
  rememberedGuestName,
} from "@/features/trade-offers/lib/guest-identity";
import {
  publicTradeOffersKeys,
  submitTradeOffer,
  tradeOfferQuoteQueryOptions,
} from "@/features/trade-offers/api/public-trade-offers";
import { GuestTradeOfferList } from "@/features/trade-offers/components/guest-trade-offer-list";
import { TradeOfferAccountNotice } from "@/features/trade-offers/components/trade-offer-account-notice";
import {
  clearTradeOfferDraft,
  readTradeOfferDraft,
  saveTradeOfferDraft,
} from "@/features/trade-offers/lib/trade-offer-draft-storage";
import { TradeOfferCardSearch } from "@/features/trade-offers/components/trade-offer-card-search";
import { TradeOfferOfferedRow } from "@/features/trade-offers/components/trade-offer-offered-row";
import { TradeOfferGuestBalance } from "@/features/trade-offers/components/trade-offer-guest-balance";
import { TradeOfferPanel } from "@/features/trade-offers/components/trade-offer-panel";
import { toOfferedCardInput } from "@/features/trade-offers/lib/offered-card-input";
import type { OfferedCardDraft, TradeOfferPageProps } from "@/lib/interfaces/trade-offers";
import { toast } from "@/lib/toast";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_CARD_CONDITION,
  TRADE_OFFER_OFFERED_CARDS_MAX,
  formatPrice,
  formatPriceInCurrency,
  parseTradeOfferCashInput,
  tradeOfferFormSchemaFor,
  tradeOfferGuestBalance,
  type TradeOfferFormValues,
  type TradeOfferQuoteRequest,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconCards,
  IconLoader2,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function TradeOfferPage({
  link,
  sourceName,
  defaultGameKey,
  cashCurrency,
  priceSource,
  showsPrices,
  isVisible,
  onBack,
}: TradeOfferPageProps) {
  const { t } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const queryClient = useQueryClient();
  const tradeOffer = useTradeOfferContext();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (isVisible) headingRef.current?.focus();
  }, [isVisible]);
  const wanted = useMemo(() => tradeOffer?.wanted ?? [], [tradeOffer?.wanted]);
  const formId = useId();
  const nameId = useId();
  const contactId = useId();
  const noteId = useId();
  const cashId = useId();
  const cashHintId = useId();
  const [restoredDraft] = useState(() => readTradeOfferDraft(link.token));
  useEffect(() => clearTradeOfferDraft(link.token), [link.token]);
  const [offered, setOffered] = useState<OfferedCardDraft[]>(restoredDraft?.offered ?? []);
  const form = useForm<TradeOfferFormValues>({
    resolver: zodResolver(tradeOfferFormSchemaFor(link.requiresGuestContact)),
    defaultValues: {
      guestName: rememberedGuestName(),
      guestContact: "",
      guestNote: "",
      offeredCash: "",
      ...restoredDraft?.values,
    },
  });
  const keepDraftForSignIn = () =>
    saveTradeOfferDraft(link.token, { wanted, offered, values: form.getValues() });
  const { errors, isSubmitting } = form.formState;
  const offeredCount = offered.reduce((sum, draft) => sum + draft.quantity, 0);
  const offeredCash = parseTradeOfferCashInput(form.watch("offeredCash") ?? "");
  const isReady = wanted.length > 0;
  const quoteRequest = useMemo<TradeOfferQuoteRequest>(
    () => ({
      wantedScanIds: wanted.map((entry) => entry.scanId),
      offered: offered.map(toOfferedCardInput),
    }),
    [wanted, offered],
  );
  const quote = useQuery(tradeOfferQuoteQueryOptions(link, quoteRequest, showsPrices));
  const currentQuote = quote.isPlaceholderData ? undefined : quote.data;
  const balance =
    showsPrices && quote.data && (wanted.length > 0 || offered.length > 0)
      ? tradeOfferGuestBalance(quote.data, offeredCash)
      : null;
  const rowPriceLabel = (price: number | null | undefined) =>
    price === undefined ? null : price == null ? t("tradeOffers.noPrice") : formatPrice(price, priceSource);
  const summary =
    offered.length === 0 && offeredCash == null
      ? t("tradeOffers.summaryNothing", { get: wanted.length })
      : offeredCash == null
        ? t("tradeOffers.summary", { get: wanted.length, give: offeredCount })
        : t("tradeOffers.summaryWithCash", {
            get: wanted.length,
            give: offeredCount,
            cash: formatPriceInCurrency(offeredCash, cashCurrency),
          });

  const submit = form.handleSubmit(async ({ offeredCash: offeredCashInput, ...values }) => {
    if (!isReady) return;
    const offeredCashAmount = parseTradeOfferCashInput(offeredCashInput);
    try {
      await submitTradeOffer(link, {
        ...values,
        ...(offeredCashAmount != null ? { offeredCashAmount } : {}),
        ...quoteRequest,
      });
      rememberGuestName(values.guestName);
      setOffered([]);
      form.reset({ ...values, guestNote: "", offeredCash: "" });
      void queryClient.invalidateQueries({ queryKey: publicTradeOffersKeys.mine(link) });
      toast.success(t("tradeOffers.sent"));
      tradeOffer?.clearWanted();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("tradeOffers.sendFailed"));
    }
  });

  return (
    <form id={formId} onSubmit={submit} className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 md:gap-2 p-4 md:px-3 md:py-2">
        <Button type="button" variant="ghost" className="self-start" onClick={onBack}>
          <IconArrowLeft />
          {t("publicBrowse.backToCards")}
        </Button>
        <div className="flex flex-col gap-1">
          <h2 ref={headingRef} tabIndex={-1} className="font-heading text-base font-semibold outline-none">
            {t("tradeOffers.title")}
          </h2>
          <p className="text-sm text-foreground/70">
            {t("tradeOffers.pageDescription", { source: sourceName })}
          </p>
        </div>

        <TradeOfferAccountNotice onBeforeSignIn={keepDraftForSignIn} />

        <TradeOfferPanel
          step={1}
          headingId={`${formId}-details`}
          title={t("tradeOffers.detailsTitle")}
          description={t("tradeOffers.detailsDescription")}
        >
          <div className="grid gap-3 md:gap-2 md:grid-cols-2">
            <Field data-invalid={!!errors.guestName}>
              <FieldLabel htmlFor={nameId}>{t("tradeOffers.nameLabel")}</FieldLabel>
              <Input id={nameId} autoComplete="name" {...form.register("guestName")} />
              <FieldError errors={[errors.guestName]} />
            </Field>
            <Field data-invalid={!!errors.guestContact}>
              <FieldLabel htmlFor={contactId}>
                {link.requiresGuestContact
                  ? t("tradeOffers.contactLabel")
                  : t("tradeOffers.contactLabelOptional")}
              </FieldLabel>
              <Input
                id={contactId}
                placeholder={t("tradeOffers.contactPlaceholder")}
                {...form.register("guestContact")}
              />
              <FieldError errors={[errors.guestContact]} />
            </Field>
          </div>
          <Field data-invalid={!!errors.guestNote}>
            <FieldLabel htmlFor={noteId}>{t("tradeOffers.noteLabel")}</FieldLabel>
            <Textarea id={noteId} rows={2} {...form.register("guestNote")} />
            <FieldError errors={[errors.guestNote]} />
          </Field>
        </TradeOfferPanel>

        <div className="grid items-stretch gap-3 md:gap-1.5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <TradeOfferPanel
            step={2}
            headingId={`${formId}-get`}
            title={t("tradeOffers.getTitle", { count: wanted.length })}
            description={t("tradeOffers.getDescription", { source: sourceName })}
          >
            {wanted.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg bg-foreground/6 p-6 text-center">
                <IconCards className="size-5 text-foreground/70" aria-hidden />
                <p className="text-xs text-foreground/70">{t("tradeOffers.getEmpty")}</p>
                <Button type="button" variant="outline" onClick={onBack}>
                  {t("tradeOffers.browseCards")}
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-border">
                  {wanted.map((entry, index) => (
                    <li key={entry.scanId} className="flex items-center gap-2.5 p-2">
                      <img
                        src={entry.card.image?.small || entry.card.image?.normal || ""}
                        alt=""
                        className="aspect-[2.5/3.5] w-10 shrink-0 rounded-sm bg-muted object-cover"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-control font-medium">{entry.card.name}</span>
                        <span className="truncate text-xs text-foreground/70">
                          {[entry.card.setName, entry.condition, entry.isFoil ? (entry.foilType ?? t("foil")) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      {rowPriceLabel(currentQuote?.wantedPrices[index]) != null && (
                        <span className="shrink-0 text-control font-medium tabular-nums">
                          {rowPriceLabel(currentQuote?.wantedPrices[index])}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={tCommon("a11y.removeItem", { name: entry.card.name })}
                        onClick={() => tradeOffer?.removeWanted(entry.scanId)}
                      >
                        <IconTrash />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="ghost" className="self-start" onClick={onBack}>
                  {t("tradeOffers.addMoreCards")}
                </Button>
              </>
            )}
          </TradeOfferPanel>

          <div className="flex items-center justify-center max-md:hidden" aria-hidden>
            <span className="flex size-8 items-center justify-center rounded-full bg-card">
              <IconArrowsExchange className="size-4 text-foreground/70" />
            </span>
          </div>

          <TradeOfferPanel
            step={3}
            headingId={`${formId}-give`}
            title={t("tradeOffers.giveTitle", { count: offeredCount })}
            description={t("tradeOffers.giveDescription")}
          >
            <TradeOfferCardSearch
              link={link}
              defaultGameKey={defaultGameKey}
              onAdd={(option) =>
                setOffered((current) =>
                  current.length >= TRADE_OFFER_OFFERED_CARDS_MAX
                    ? current
                    : [...current, { option, quantity: 1, condition: DEFAULT_CARD_CONDITION, isFoil: false }],
                )
              }
            />
            <Field data-invalid={!!errors.offeredCash}>
              <FieldLabel htmlFor={cashId}>
                {t("tradeOffers.cashLabel", { currency: cashCurrency })}
              </FieldLabel>
              <Input
                id={cashId}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                aria-describedby={cashHintId}
                {...form.register("offeredCash")}
              />
              <FieldDescription id={cashHintId}>{t("tradeOffers.cashHint")}</FieldDescription>
              <FieldError errors={[errors.offeredCash]} />
            </Field>
            {offered.length === 0 ? (
              <p className="rounded-lg bg-foreground/6 p-4 text-center text-xs text-foreground/70">
                {t("tradeOffers.giveEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {offered.map((draft, index) => (
                  <TradeOfferOfferedRow
                    key={`${draft.option.gameKey}-${draft.option.cardId}-${index}`}
                    draft={draft}
                    priceLabel={rowPriceLabel(currentQuote?.offeredPrices[index])}
                    onChange={(next) =>
                      setOffered((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                      )
                    }
                    onRemove={() =>
                      setOffered((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  />
                ))}
              </ul>
            )}
          </TradeOfferPanel>
        </div>

        <GuestTradeOfferList link={link} />
      </div>

      <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-2xl">
        {balance && (
          <div className="mx-auto w-full max-w-5xl px-4 pt-3 md:px-3 md:pt-2">
            <TradeOfferGuestBalance
              balance={balance}
              priceSource={priceSource}
              isUpdating={quote.isPlaceholderData || quote.isFetching}
            />
          </div>
        )}
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-3 md:py-2">
          <p role="status" className="text-control">
            {isReady ? summary : t("tradeOffers.needGet")}
          </p>
          <Button type="submit" disabled={!isReady || isSubmitting}>
            {isSubmitting ? <IconLoader2 className="animate-spin" /> : <IconSend />}
            {t("tradeOffers.send")}
          </Button>
        </div>
      </div>
    </form>
  );
}
