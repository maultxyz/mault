import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePriceSource } from "@/hooks/use-price-source";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  inPersonTradeQuoteQueryOptions,
  useRecordInPersonTrade,
} from "@/features/trade-offers/api/in-person-trades";
import { InPersonGivenCardSearch } from "@/features/trade-offers/components/in-person-given-card-search";
import { InPersonReceivedCardSearch } from "@/features/trade-offers/components/in-person-received-card-search";
import { TradeOfferGuestBalance } from "@/features/trade-offers/components/trade-offer-guest-balance";
import { TradeOfferOfferedRow } from "@/features/trade-offers/components/trade-offer-offered-row";
import { TradeOfferPanel } from "@/features/trade-offers/components/trade-offer-panel";
import { tradeOfferPath } from "@/lib/constants/trade-offers";
import type { InPersonGivenCardDraft, OfferedCardDraft } from "@/lib/interfaces/trade-offers";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_CARD_CONDITION,
  IN_PERSON_TRADE_GIVEN_CARDS_MAX,
  IN_PERSON_TRADE_RECEIVED_CARDS_MAX,
  PRICE_SOURCE_FIELDS,
  formatPrice,
  inPersonTradeBalance,
  inPersonTradeFormSchema,
  parseTradeOfferCashInput,
  type InPersonTradeCashDirection,
  type InPersonTradeFormValues,
  type InPersonTradeQuoteRequest,
} from "@magic-vault/shared";
import { IconArrowsExchange, IconCheck, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function InPersonTradeForm() {
  const { t } = useTranslation("common");
  const { t: tCards } = useTranslation("cards");
  const navigate = useNavigate();
  const formId = useId();
  const nameId = useId();
  const contactId = useId();
  const noteId = useId();
  const cashId = useId();
  const collectionSelectId = useId();
  const { activeOrg } = useOrg();
  const { collections } = useCollections();
  const { source: orgPriceSource } = usePriceSource();
  const [given, setGiven] = useState<InPersonGivenCardDraft[]>([]);
  const [received, setReceived] = useState<OfferedCardDraft[]>([]);
  const [receiveCollectionGuid, setReceiveCollectionGuid] = useState("");
  const receiveCollection = collections.find((collection) => collection.guid === receiveCollectionGuid) ?? null;
  const form = useForm<InPersonTradeFormValues>({
    resolver: zodResolver(inPersonTradeFormSchema),
    defaultValues: { partnerName: "", partnerContact: "", note: "", cash: "", cashDirection: "received" },
  });
  const { errors } = form.formState;
  const record = useRecordInPersonTrade();
  const cashAmount = parseTradeOfferCashInput(form.watch("cash") ?? "");
  const cashDirection = form.watch("cashDirection");
  const quoteRequest = useMemo<InPersonTradeQuoteRequest>(
    () => ({
      givenScanIds: given.map((card) => card.scanId),
      ...(receiveCollectionGuid ? { receiveCollectionGuid } : {}),
      received: received.map((draft) => ({
        cardId: draft.option.cardId,
        quantity: draft.quantity,
        condition: draft.condition,
        isFoil: draft.isFoil,
      })),
    }),
    [given, received, receiveCollectionGuid],
  );
  const quote = useQuery(inPersonTradeQuoteQueryOptions(activeOrg?.id, quoteRequest));
  const currentQuote = quote.isPlaceholderData ? undefined : quote.data;
  const priceSource = quote.data?.priceSource ?? orgPriceSource;
  const cashCurrency = PRICE_SOURCE_FIELDS[priceSource].currency;
  const balance =
    quote.data && (given.length > 0 || received.length > 0 || cashAmount != null)
      ? inPersonTradeBalance(quote.data, cashAmount == null ? null : { amount: cashAmount, direction: cashDirection })
      : null;
  const rowPriceLabel = (price: number | null | undefined) =>
    price === undefined ? null : price == null ? tCards("tradeOffers.noPrice") : formatPrice(price, priceSource);
  const hasContent = given.length > 0 || received.length > 0 || cashAmount != null;

  const changeReceiveCollection = (nextGuid: string) => {
    setReceiveCollectionGuid(nextGuid);
    setReceived([]);
  };

  const submit = form.handleSubmit(async ({ cash, ...values }) => {
    const parsedCash = parseTradeOfferCashInput(cash);
    try {
      const created = await record.mutateAsync({
        ...values,
        ...quoteRequest,
        ...(parsedCash != null ? { cashAmount: parsedCash } : {}),
      });
      toast.success(t("tradeOffers.inPerson.recorded"));
      navigate(tradeOfferPath(created.guid));
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("tradeOffers.inPerson.recordFailed"));
    }
  });

  return (
    <form id={formId} onSubmit={submit} className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 md:gap-2 md:px-3 md:py-2">
        <TradeOfferPanel
          step={1}
          headingId={`${formId}-details`}
          title={t("tradeOffers.inPerson.detailsTitle")}
          description={t("tradeOffers.inPerson.detailsDescription")}
        >
          <div className="grid gap-3 md:grid-cols-2 md:gap-2">
            <Field data-invalid={!!errors.partnerName}>
              <FieldLabel htmlFor={nameId}>{t("tradeOffers.inPerson.partnerName")}</FieldLabel>
              <Input id={nameId} autoComplete="off" {...form.register("partnerName")} />
              <FieldError errors={[errors.partnerName]} />
            </Field>
            <Field data-invalid={!!errors.partnerContact}>
              <FieldLabel htmlFor={contactId}>{t("tradeOffers.inPerson.partnerContact")}</FieldLabel>
              <Input id={contactId} autoComplete="off" {...form.register("partnerContact")} />
              <FieldError errors={[errors.partnerContact]} />
            </Field>
          </div>
          <Field data-invalid={!!errors.note}>
            <FieldLabel htmlFor={noteId}>{tCards("tradeOffers.noteLabel")}</FieldLabel>
            <Textarea id={noteId} rows={2} {...form.register("note")} />
            <FieldError errors={[errors.note]} />
          </Field>
        </TradeOfferPanel>

        <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-1.5">
          <TradeOfferPanel
            step={2}
            headingId={`${formId}-give`}
            title={t("tradeOffers.inPerson.giveTitle", { count: given.length })}
            description={t("tradeOffers.inPerson.giveDescription")}
          >
            <InPersonGivenCardSearch
              selectedScanIds={given.map((card) => card.scanId)}
              onAdd={(card) =>
                setGiven((current) =>
                  current.length >= IN_PERSON_TRADE_GIVEN_CARDS_MAX ? current : [...current, card],
                )
              }
            />
            {given.length === 0 ? (
              <p className="rounded-lg bg-foreground/6 p-4 text-center text-xs text-foreground/70">
                {t("tradeOffers.inPerson.giveEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {given.map((card, index) => {
                  const priceLabel = rowPriceLabel(currentQuote?.wantedPrices[index]);
                  return (
                    <li key={card.scanId} className="flex items-center gap-2.5 p-2">
                      <img
                        src={card.imageUrl ?? ""}
                        alt=""
                        className="aspect-[2.5/3.5] w-10 shrink-0 rounded-sm bg-muted object-cover"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-control font-medium">{card.name}</span>
                        <span className="truncate text-xs text-foreground/70">{card.subtitle}</span>
                      </div>
                      {priceLabel != null && (
                        <span className="shrink-0 text-control font-medium tabular-nums">{priceLabel}</span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("a11y.removeItem", { name: card.name })}
                        onClick={() => setGiven((current) => current.filter((item) => item.scanId !== card.scanId))}
                      >
                        <IconTrash />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TradeOfferPanel>

          <div className="flex items-center justify-center max-md:hidden" aria-hidden>
            <span className="flex size-8 items-center justify-center rounded-full bg-card">
              <IconArrowsExchange className="size-4 text-foreground/70" />
            </span>
          </div>

          <TradeOfferPanel
            step={3}
            headingId={`${formId}-get`}
            title={t("tradeOffers.inPerson.getTitle", {
              count: received.reduce((sum, draft) => sum + draft.quantity, 0),
            })}
            description={t("tradeOffers.inPerson.getDescription")}
          >
            <Field>
              <FieldLabel htmlFor={collectionSelectId}>{t("tradeOffers.inPerson.receiveCollection")}</FieldLabel>
              <Select
                value={receiveCollectionGuid}
                onValueChange={(next) => changeReceiveCollection(String(next ?? ""))}
              >
                <SelectTrigger id={collectionSelectId} className="w-full">
                  <SelectValue placeholder={t("tradeOffers.inPerson.receiveCollectionPlaceholder")}>
                    {receiveCollection?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.guid} value={collection.guid}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {receiveCollection && (
              <InPersonReceivedCardSearch
                collectionGuid={receiveCollection.guid}
                gameKey={receiveCollection.game?.key ?? ""}
                onAdd={(option) =>
                  setReceived((current) =>
                    current.length >= IN_PERSON_TRADE_RECEIVED_CARDS_MAX
                      ? current
                      : [...current, { option, quantity: 1, condition: DEFAULT_CARD_CONDITION, isFoil: false }],
                  )
                }
              />
            )}
            {received.length === 0 ? (
              <p className="rounded-lg bg-foreground/6 p-4 text-center text-xs text-foreground/70">
                {receiveCollection ? t("tradeOffers.inPerson.getEmpty") : t("tradeOffers.inPerson.pickCollectionFirst")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {received.map((draft, index) => (
                  <TradeOfferOfferedRow
                    key={`${draft.option.cardId}-${index}`}
                    draft={draft}
                    priceLabel={rowPriceLabel(currentQuote?.offeredPrices[index])}
                    onChange={(next) =>
                      setReceived((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)))
                    }
                    onRemove={() => setReceived((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />
                ))}
              </ul>
            )}
          </TradeOfferPanel>
        </div>

        <section aria-labelledby={`${formId}-cash`} className="flex flex-col gap-2 rounded-card bg-card p-4 md:p-2.5">
          <h3 id={`${formId}-cash`} className="font-heading text-sm font-semibold">
            {t("tradeOffers.inPerson.cashTitle")}
          </h3>
          <div className="flex flex-wrap items-end gap-1.5">
            <Controller
              name="cashDirection"
              control={form.control}
              render={({ field }) => (
                <ResponsiveSegmented<InPersonTradeCashDirection>
                  label={t("tradeOffers.inPerson.cashDirection")}
                  value={field.value}
                  onChange={field.onChange}
                  items={[
                    { key: "received", label: t("tradeOffers.inPerson.cashReceived") },
                    { key: "given", label: t("tradeOffers.inPerson.cashGiven") },
                  ]}
                />
              )}
            />
            <Field data-invalid={!!errors.cash} className="w-40">
              <FieldLabel htmlFor={cashId}>{tCards("tradeOffers.cashLabel", { currency: cashCurrency })}</FieldLabel>
              <Input id={cashId} inputMode="decimal" autoComplete="off" placeholder="0.00" {...form.register("cash")} />
              <FieldError errors={[errors.cash]} />
            </Field>
          </div>
        </section>
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
            {hasContent ? t("tradeOffers.inPerson.readyHint") : t("tradeOffers.inPerson.emptyHint")}
          </p>
          <Button type="submit" disabled={!hasContent || record.isPending || (received.length > 0 && !receiveCollection)}>
            {record.isPending ? <IconLoader2 className="animate-spin" /> : <IconCheck />}
            {t("tradeOffers.inPerson.record")}
          </Button>
        </div>
      </div>
    </form>
  );
}
