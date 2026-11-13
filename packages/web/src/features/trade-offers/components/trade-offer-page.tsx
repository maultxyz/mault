import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  rememberGuestName,
  rememberedGuestName,
} from "@/features/trade-offers/lib/guest-identity";
import {
  publicTradeOffersKeys,
  submitTradeOffer,
} from "@/features/trade-offers/api/public-trade-offers";
import { GuestTradeOfferList } from "@/features/trade-offers/components/guest-trade-offer-list";
import { TradeOfferCardSearch } from "@/features/trade-offers/components/trade-offer-card-search";
import { TradeOfferOfferedRow } from "@/features/trade-offers/components/trade-offer-offered-row";
import { TradeOfferPanel } from "@/features/trade-offers/components/trade-offer-panel";
import { DEFAULT_TRADE_OFFER_LANGUAGE } from "@/lib/constants/trade-offers";
import type { OfferedCardDraft, TradeOfferPageProps } from "@/lib/interfaces/trade-offers";
import { toast } from "@/lib/toast";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_CARD_CONDITION,
  TRADE_OFFER_OFFERED_CARDS_MAX,
  tradeOfferFormSchema,
  type TradeOfferFormValues,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconCards,
  IconLoader2,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function TradeOfferPage({
  link,
  sourceName,
  defaultGameKey,
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
  const wanted = tradeOffer?.wanted ?? [];
  const formId = useId();
  const nameId = useId();
  const contactId = useId();
  const noteId = useId();
  const [offered, setOffered] = useState<OfferedCardDraft[]>([]);
  const form = useForm<TradeOfferFormValues>({
    resolver: zodResolver(tradeOfferFormSchema),
    defaultValues: { guestName: rememberedGuestName(), guestContact: "", guestNote: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const offeredCount = offered.reduce((sum, draft) => sum + draft.quantity, 0);
  const isReady = wanted.length > 0 && offered.length > 0;

  const submit = form.handleSubmit(async (values) => {
    if (!isReady) return;
    try {
      await submitTradeOffer(link, {
        ...values,
        wantedScanIds: wanted.map((entry) => entry.scanId),
        offered: offered.map((draft) => ({
          gameKey: draft.option.gameKey,
          lang: draft.option.lang || DEFAULT_TRADE_OFFER_LANGUAGE,
          cardId: draft.option.cardId,
          quantity: draft.quantity,
          condition: draft.condition,
          isFoil: draft.isFoil,
        })),
      });
      rememberGuestName(values.guestName);
      setOffered([]);
      form.reset({ ...values, guestNote: "" });
      void queryClient.invalidateQueries({ queryKey: publicTradeOffersKeys.mine(link) });
      toast.success(t("tradeOffers.sent"));
      tradeOffer?.clearWanted();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("tradeOffers.sendFailed"));
    }
  });

  return (
    <form id={formId} onSubmit={submit} className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 md:gap-2 p-6 max-md:p-4">
        <Button type="button" variant="ghost" className="self-start" onClick={onBack}>
          <IconArrowLeft />
          {t("publicBrowse.backToCards")}
        </Button>
        <div className="flex flex-col gap-1">
          <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
            {t("tradeOffers.title")}
          </h2>
          <p className="text-sm text-foreground/70">
            {t("tradeOffers.pageDescription", { source: sourceName })}
          </p>
        </div>

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
              <FieldLabel htmlFor={contactId}>{t("tradeOffers.contactLabel")}</FieldLabel>
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

        <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <TradeOfferPanel
            step={2}
            headingId={`${formId}-get`}
            title={t("tradeOffers.getTitle", { count: wanted.length })}
            description={t("tradeOffers.getDescription", { source: sourceName })}
          >
            {wanted.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-muted p-6 text-center">
                <IconCards className="size-5 text-foreground/70" aria-hidden />
                <p className="text-xs text-foreground/70">{t("tradeOffers.getEmpty")}</p>
                <Button type="button" variant="outline" onClick={onBack}>
                  {t("tradeOffers.browseCards")}
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-border">
                  {wanted.map((entry) => (
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
            <span className="flex size-8 items-center justify-center rounded-full bg-muted">
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
            {offered.length === 0 ? (
              <p className="rounded-xl bg-muted p-4 text-center text-xs text-foreground/70">
                {t("tradeOffers.giveEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {offered.map((draft, index) => (
                  <TradeOfferOfferedRow
                    key={`${draft.option.gameKey}-${draft.option.cardId}-${index}`}
                    draft={draft}
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
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-3 max-md:px-4">
          <p role="status" className="text-control">
            {isReady
              ? t("tradeOffers.summary", { get: wanted.length, give: offeredCount })
              : wanted.length === 0
                ? t("tradeOffers.needGet")
                : t("tradeOffers.needGive")}
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
