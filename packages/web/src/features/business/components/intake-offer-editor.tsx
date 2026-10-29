import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useBusinessAccess,
  useSaveCardAcquisitionCost,
} from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { usePriceSource } from "@/hooks/use-price-source";
import type { IntakeOfferEditorProps } from "@/lib/interfaces/business";
import {
  intakeOfferSchema,
  type IntakeOfferFormValues,
} from "@/schemas/business.schema";
import { buylistOfferFor, DEFAULT_BUYLIST_CONFIG } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function IntakeOfferEditor({ card }: IntakeOfferEditorProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { settings } = useBusinessAccess();
  const saveCardAcquisitionCost = useSaveCardAcquisitionCost();
  const [open, setOpen] = useState(false);
  const form = useForm<IntakeOfferFormValues>({
    resolver: zodResolver(intakeOfferSchema),
    defaultValues: { offer: card.offer ?? 0 },
  });
  const buylistOffer = buylistOfferFor(
    card.marketPrice,
    settings?.buylist ?? DEFAULT_BUYLIST_CONFIG,
  );
  const name = card.card.name;

  const save = async (offer: number | null) => {
    await saveCardAcquisitionCost(card.scanId, offer);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset({ offer: card.offer ?? 0 });
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="-mr-2 font-medium tabular-nums"
            aria-label={t("offerEditor.edit", { name })}
            title={card.hasManualOffer ? t("offerEditor.manual") : undefined}
          >
            {card.offer != null ? format(card.offer) : "-"}
            <IconPencil
              className={card.hasManualOffer ? "text-primary" : "opacity-40"}
            />
          </Button>
        }
      />
      <PopoverContent align="end" className="gap-3 p-3">
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => save(values.offer))}
        >
          <p className="truncate text-sm font-medium">
            {t("offerEditor.title", { name })}
          </p>
          <Controller
            control={form.control}
            name="offer"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor={`intake-offer-${card.scanId}`}>
                  {t("offerEditor.amount")}
                </FieldLabel>
                <NumberInput
                  id={`intake-offer-${card.scanId}`}
                  autoFocus
                  min={0}
                  step={0.01}
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <p className="text-xs text-foreground/70">
            {t("offerEditor.buylistPrice", {
              price: buylistOffer != null ? format(buylistOffer) : "-",
            })}
          </p>
          <div className="flex justify-end gap-1.5">
            {card.hasManualOffer && (
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={() => void save(null)}
              >
                {t("offerEditor.useBuylist")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <IconLoader2 className="animate-spin" />
              )}
              {t("offerEditor.save")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
