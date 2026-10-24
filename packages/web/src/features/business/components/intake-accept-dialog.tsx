import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { acceptIntakeLot } from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { usePriceSource } from "@/hooks/use-price-source";
import type { IntakeAcceptDialogProps } from "@/lib/interfaces/business";
import {
  intakeAcceptSchema,
  type IntakeAcceptFormValues,
} from "@/schemas/business.schema";
import {
  creditOfferFor,
  DEFAULT_BUYLIST_CONFIG,
  INTAKE_PAYOUT_METHODS,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function IntakeAcceptDialog({
  lot,
  open,
  onOpenChange,
  onAccepted,
}: IntakeAcceptDialogProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { settings } = useBusinessAccess();
  const buylist = settings?.buylist ?? DEFAULT_BUYLIST_CONFIG;
  const run = useBusinessAction();
  const form = useForm<IntakeAcceptFormValues>({
    resolver: zodResolver(intakeAcceptSchema),
    defaultValues: { payoutMethod: "cash", useOverride: false, totalOverride: null },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        payoutMethod: "cash",
        useOverride: false,
        totalOverride: lot.cashOffer,
      });
    }
  }, [open, lot.cashOffer, form]);

  const [payoutMethod, useOverride, totalOverride] = useWatch({
    control: form.control,
    name: ["payoutMethod", "useOverride", "totalOverride"],
  });
  const cash =
    useOverride && totalOverride != null && Number.isFinite(totalOverride)
      ? totalOverride
      : (lot.cashOffer ?? 0);
  const payout = payoutMethod === "credit" ? creditOfferFor(cash, buylist) : cash;

  const submit = async (values: IntakeAcceptFormValues) => {
    const result = await run(
      () =>
        acceptIntakeLot(lot.guid, {
          payoutMethod: values.payoutMethod,
          totalOverride: values.useOverride ? values.totalOverride : null,
        }),
      t("intake.accepted"),
    );
    if (result) {
      onOpenChange(false);
      onAccepted();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("intake.acceptTitle")}</DialogTitle>
          <DialogDescription>
            {t("intake.acceptDescription", {
              count: lot.cardCount,
              name: lot.customerName,
            })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="intake-accept-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            control={form.control}
            name="payoutMethod"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("intake.payoutMethod")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("intake.payoutMethod")}
                  items={INTAKE_PAYOUT_METHODS.map((method) => ({
                    key: method,
                    label: t(`intake.payout.${method}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="useOverride"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">{t("intake.overrideLabel")}</span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {useOverride && (
            <Controller
              control={form.control}
              name="totalOverride"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="intake-override">
                    {t("intake.overrideAmount")}
                  </FieldLabel>
                  <NumberInput
                    id="intake-override"
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
          )}
          <div className="rounded-lg border p-3">
            <p className="text-xs text-foreground/70">
              {t(`intake.payoutTotal.${payoutMethod}`)}
            </p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {format(payout)}
            </p>
            <p className="text-xs text-foreground/70">
              {t("intake.costBasisNote", { amount: format(cash) })}
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="intake-accept-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("intake.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
