import { MissingPrice } from "@/components/missing-price";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  publicCardReservationsKey,
  reserveCards,
} from "@/features/card-reservations/api/public-card-reservations";
import { GuestCardReservationList } from "@/features/card-reservations/components/guest-card-reservation-list";
import { TradeOfferPanel } from "@/features/trade-offers/components/trade-offer-panel";
import {
  rememberGuestContact,
  rememberGuestName,
  rememberedGuestContact,
  rememberedGuestName,
} from "@/features/trade-offers/lib/guest-identity";
import { usePriceSource } from "@/hooks/use-price-source";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import type { ReservationComposerPageProps } from "@/lib/interfaces/card-reservations";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CARD_RESERVATION_HOLDER_QUEUE_POSITION,
  cardReservationFormSchema,
  type CardReservationFormValues,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconBookmark,
  IconCards,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ReservationComposerPage({
  source,
  sourceName,
  showsPrices,
  isVisible,
  onBack,
  onOpenCard,
}: ReservationComposerPageProps) {
  const { t } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const queryClient = useQueryClient();
  const reservations = useCardReservationsContext();
  const { priceOf, format } = usePriceSource();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();
  const nameId = useId();
  const contactId = useId();
  const contactHintId = useId();
  const noteId = useId();
  useEffect(() => {
    if (isVisible) headingRef.current?.focus();
  }, [isVisible]);
  const form = useForm<CardReservationFormValues>({
    resolver: zodResolver(cardReservationFormSchema),
    defaultValues: {
      guestName: rememberedGuestName(),
      guestContact: rememberedGuestContact(),
      guestNote: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const cart = reservations?.cart ?? [];
  const holdDays = reservations?.holdDays ?? 0;
  const rows = cart.map((entry) => ({
    entry,
    queueLength: reservations?.queueLengthOf(entry.scanId) ?? 0,
    price: showsPrices
      ? entry.sellPrice !== undefined
        ? entry.sellPrice
        : priceOf(entry.card, { isFoil: entry.isFoil, foilType: entry.foilType ?? undefined }, entry.condition)
      : null,
  }));
  const heldCount = rows.filter((row) => row.queueLength === 0).length;
  const waitingCount = rows.length - heldCount;
  const total = rows.reduce((sum, row) => sum + (row.price ?? 0), 0);
  const hasMissingPrices = rows.some((row) => row.price == null);
  const isReady = cart.length > 0;

  const submit = form.handleSubmit(async (values) => {
    if (!isReady || !reservations) return;
    try {
      const created = await reserveCards(source, {
        ...values,
        scanIds: cart.map((entry) => entry.scanId),
      });
      rememberGuestName(values.guestName);
      rememberGuestContact(values.guestContact);
      form.reset({ ...values, guestNote: "" });
      reservations.clearCart();
      toast.success(
        created.waitingCount === 0
          ? t("reservations.created", { count: created.heldCount })
          : t("reservations.createdWithLine", {
              count: created.heldCount + created.waitingCount,
              waiting: created.waitingCount,
            }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error && error.message ? error.message : t("reservations.createFailed"),
      );
    } finally {
      void queryClient.invalidateQueries({ queryKey: publicCardReservationsKey(source) });
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
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-base font-semibold outline-none"
          >
            {t("reservations.composerTitle")}
          </h2>
          <p className="text-sm text-foreground/70">
            {t("reservations.composerDescription", { source: sourceName, count: holdDays })}
          </p>
        </div>

        <TradeOfferPanel
          step={1}
          headingId={`${formId}-details`}
          title={t("reservations.detailsTitle")}
          description={t("reservations.detailsDescription")}
        >
          <div className="grid gap-3 md:gap-2 md:grid-cols-2">
            <Field data-invalid={!!errors.guestName}>
              <FieldLabel htmlFor={nameId}>{t("reservations.nameLabel")}</FieldLabel>
              <Input id={nameId} autoComplete="name" {...form.register("guestName")} />
              <FieldError errors={[errors.guestName]} />
            </Field>
            <Field data-invalid={!!errors.guestContact}>
              <FieldLabel htmlFor={contactId}>{t("reservations.contactLabel")}</FieldLabel>
              <Input
                id={contactId}
                aria-describedby={contactHintId}
                {...form.register("guestContact")}
              />
              <FieldDescription id={contactHintId}>{t("reservations.contactHint")}</FieldDescription>
              <FieldError errors={[errors.guestContact]} />
            </Field>
          </div>
          <Field data-invalid={!!errors.guestNote}>
            <FieldLabel htmlFor={noteId}>{t("reservations.noteLabel")}</FieldLabel>
            <Textarea id={noteId} rows={2} {...form.register("guestNote")} />
            <FieldError errors={[errors.guestNote]} />
          </Field>
        </TradeOfferPanel>

        <TradeOfferPanel
          step={2}
          headingId={`${formId}-cards`}
          title={t("reservations.cardsTitle", { count: cart.length })}
          description={t("reservations.cardsDescription")}
        >
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-foreground/6 p-6 text-center">
              <IconCards className="size-5 text-foreground/70" aria-hidden />
              <p className="text-xs text-foreground/70">{t("reservations.cartEmpty")}</p>
              <Button type="button" variant="outline" onClick={onBack}>
                {t("reservations.browseCards")}
              </Button>
            </div>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border">
                {rows.map(({ entry, queueLength, price }) => (
                  <li key={entry.scanId} className="flex items-center gap-2.5 p-2">
                    <img
                      src={entry.card.image?.small || entry.card.image?.normal || ""}
                      alt=""
                      className="aspect-[2.5/3.5] w-10 shrink-0 rounded-sm bg-muted object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-control font-medium">{entry.card.name}</span>
                      <span className="truncate text-xs text-foreground/70">
                        {[
                          entry.card.setName,
                          entry.condition,
                          entry.isFoil ? (entry.foilType ?? t("foil")) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className="text-xs text-foreground/70">
                        {queueLength === 0
                          ? t("reservations.cartRowHeld", { count: holdDays })
                          : t("reservations.cartRowInLine", {
                              position: queueLength + CARD_RESERVATION_HOLDER_QUEUE_POSITION,
                            })}
                      </span>
                    </div>
                    {showsPrices && (
                      <span className="shrink-0 text-control font-medium tabular-nums">
                        {price == null ? <MissingPrice /> : format(price)}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={tCommon("a11y.removeItem", { name: entry.card.name })}
                      onClick={() => reservations?.removeFromCart(entry.scanId)}
                    >
                      <IconTrash />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="ghost" className="self-start" onClick={onBack}>
                {t("reservations.addMoreCards")}
              </Button>
            </>
          )}
        </TradeOfferPanel>

        <GuestCardReservationList onOpenCard={onOpenCard} />
      </div>

      <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 max-md:flex-col max-md:items-stretch md:px-3 md:py-2">
          <div role="status" className="flex flex-col text-control">
            <span>
              {!isReady
                ? t("reservations.needCards")
                : waitingCount === 0
                  ? t("reservations.summaryHeld", { count: heldCount })
                  : t("reservations.summaryWithLine", {
                      count: cart.length,
                      held: heldCount,
                      waiting: waitingCount,
                    })}
            </span>
            {isReady && showsPrices && (
              <span className="text-xs text-foreground/70">
                {hasMissingPrices
                  ? t("reservations.totalMissingPrices", { total: format(total) })
                  : t("reservations.total", { total: format(total) })}
              </span>
            )}
          </div>
          <Button type="submit" disabled={!isReady || isSubmitting}>
            {isSubmitting ? <IconLoader2 className="animate-spin" /> : <IconBookmark />}
            {t("reservations.submit", { count: cart.length })}
          </Button>
        </div>
      </div>
    </form>
  );
}
