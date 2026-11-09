import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { CardHoldRequestError } from "@/features/card-holds/lib/card-hold-request-error";
import {
  rememberGuestName,
  rememberedGuestName,
} from "@/features/card-holds/lib/guest-identity";
import {
  firstAvailableScanId,
  holdForScans,
} from "@/features/card-holds/lib/hold-for-scans";
import { usePriceSource } from "@/hooks/use-price-source";
import type { CardHoldDialogProps } from "@/lib/interfaces/card-holds";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  cardHoldRequestFormSchema,
  type CardHoldRequestFormValues,
} from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function CardHoldDialog({
  target,
  holdsByScanId,
  placeHold,
  releaseHold,
  onClose,
}: CardHoldDialogProps) {
  const { t, i18n } = useTranslation("common");
  const { priceOf, format } = usePriceSource();
  const formId = useId();
  const nameId = useId();
  const noteId = useId();
  const form = useForm<CardHoldRequestFormValues>({
    resolver: zodResolver(cardHoldRequestFormSchema),
    defaultValues: { guestName: rememberedGuestName(), guestNote: "" },
  });

  useEffect(() => {
    if (target) form.reset({ guestName: rememberedGuestName(), guestNote: "" });
  }, [target, form]);

  const scanIds = target?.scanIds ?? [];
  const hold = holdForScans(holdsByScanId, scanIds);
  const availableScanId = firstAvailableScanId(holdsByScanId, scanIds);
  const card = target?.card;
  const price = target
    ? priceOf(
        target.card,
        { isFoil: target.isFoil, foilType: target.foilType },
        target.condition,
      )
    : null;
  const heldUntil = hold?.expiresAt
    ? new Date(hold.expiresAt).toLocaleTimeString(i18n.language, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const submit = async (values: CardHoldRequestFormValues) => {
    if (!availableScanId || !card) return;
    try {
      await placeHold.mutateAsync({ scanId: availableScanId, ...values });
      rememberGuestName(values.guestName);
      toast.success(t("cardHolds.placed", { name: card.name }));
      onClose();
    } catch (error) {
      const status = error instanceof CardHoldRequestError ? error.status : 0;
      toast.error(
        status === 409
          ? t("cardHolds.alreadyHeld")
          : status === 429
            ? t("cardHolds.limitReached")
            : t("cardHolds.placeFailed"),
      );
    }
  };

  const release = async () => {
    if (!hold || !card) return;
    try {
      await releaseHold.mutateAsync(hold.scanId);
      toast.success(t("cardHolds.released", { name: card.name }));
      onClose();
    } catch {
      toast.error(t("cardHolds.releaseFailed"));
    }
  };

  const canPlaceHold = !hold?.isMine && availableScanId !== undefined;

  return (
    <DynamicDialog
      open={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={card?.name ?? t("cardHolds.title")}
      description={t("cardHolds.description")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("shareLink.close")}
          </Button>
          {hold?.isMine ? (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={release}
              disabled={releaseHold.isPending}
            >
              {releaseHold.isPending && <IconLoader2 className="animate-spin" />}
              {t("cardHolds.release")}
            </Button>
          ) : canPlaceHold ? (
            <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
              {t("cardHolds.hold")}
            </Button>
          ) : null}
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      {card && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <img
              src={card.image?.normal || card.image?.small || ""}
              alt={card.name}
              className="aspect-[2.5/3.5] w-24 shrink-0 rounded-md object-cover ring-1 ring-border"
            />
            <div className="flex min-w-0 flex-col gap-1 text-control">
              {card.setName && <p className="text-foreground/70">{card.setName}</p>}
              {price != null && <p className="font-medium">{format(price)}</p>}
              <p role="status" className="font-medium">
                {hold?.isMine
                  ? heldUntil
                    ? t("cardHolds.yourHoldUntil", { time: heldUntil })
                    : t("cardHolds.yourHoldApproved")
                  : canPlaceHold
                    ? scanIds.some((scanId) => holdsByScanId.has(scanId))
                      ? t("cardHolds.someCopiesHeld")
                      : t("cardHolds.available")
                    : t("cardHolds.heldBySomeoneElse")}
              </p>
            </div>
          </div>
          {canPlaceHold && (
            <form
              id={formId}
              onSubmit={form.handleSubmit(submit)}
              className="flex flex-col gap-3"
            >
              <Controller
                name="guestName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={nameId}>{t("cardHolds.nameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id={nameId}
                      autoComplete="name"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="guestNote"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={noteId}>{t("cardHolds.noteLabel")}</FieldLabel>
                    <Textarea
                      {...field}
                      id={noteId}
                      rows={2}
                      placeholder={t("cardHolds.notePlaceholder")}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </form>
          )}
        </div>
      )}
    </DynamicDialog>
  );
}
