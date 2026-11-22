import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { acceptIntakeLot } from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import { intakeReceiptPath } from "@/lib/constants/business";
import type { BuyFinishDialogProps } from "@/lib/interfaces/business";
import { buyFinishSchema, type BuyFinishFormValues } from "@/schemas/business.schema";
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

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function BuyFinishDialog({ lot, open, onOpenChange, onFinished }: BuyFinishDialogProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { format } = usePriceSource();
  const { settings, access } = useBusinessAccess();
  const buylist = settings?.buylist ?? DEFAULT_BUYLIST_CONFIG;
  const run = useBusinessAction();
  const isCustomer = lot.sourceType === "customer";
  const isOpenedProduct = lot.sourceType === "opened";
  const offersReceipt = isCustomer && !isMobile;
  const showsMoney = access?.canViewCosts ?? false;
  const offeredTotal = roundToCents(lot.cashOffer ?? 0);
  const initialTotal = isOpenedProduct ? Number.NaN : offeredTotal;
  const form = useForm<BuyFinishFormValues>({
    resolver: zodResolver(buyFinishSchema),
    defaultValues: { payoutMethod: "cash", totalPaid: initialTotal, printReceipt: false },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({ payoutMethod: "cash", totalPaid: initialTotal, printReceipt: false });
    }
  }, [open, initialTotal, form]);

  const [payoutMethod, totalPaid] = useWatch({
    control: form.control,
    name: ["payoutMethod", "totalPaid"],
  });
  const cash = totalPaid != null && Number.isFinite(totalPaid) ? totalPaid : offeredTotal;
  const isOverridden = roundToCents(cash) !== offeredTotal;
  const payout = payoutMethod === "credit" ? creditOfferFor(cash, buylist) : cash;
  const destination = lot.destinationLocationName
    ? t("intake.finish.destinationWithLocation", {
        collection: lot.collectionName,
        location: lot.destinationLocationName,
      })
    : t("intake.finish.destination", { collection: lot.collectionName });

  const submit = async (values: BuyFinishFormValues) => {
    const sendsOverride = isOpenedProduct || roundToCents(values.totalPaid) !== offeredTotal;
    const result = await run(
      () =>
        acceptIntakeLot(lot.guid, {
          payoutMethod: isCustomer ? values.payoutMethod : "cash",
          totalOverride: sendsOverride ? values.totalPaid : null,
        }),
      t("intake.accepted"),
    );
    if (!result) return;
    if (offersReceipt && values.printReceipt) {
      window.open(intakeReceiptPath(lot.guid, true), "_blank");
    }
    onOpenChange(false);
    onFinished();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("intake.acceptTitle")}</DialogTitle>
          <DialogDescription>
            {t("intake.acceptDescription", { count: lot.cardCount, name: lot.customerName })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="buy-finish-form"
          className="flex flex-col gap-4 md:gap-2"
          onSubmit={form.handleSubmit(submit)}
        >
          {isCustomer && (
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
          )}
          {(showsMoney || isOpenedProduct) && (
            <Controller
              control={form.control}
              name="totalPaid"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="buy-total-paid">
                    {t(isOpenedProduct ? "intake.finish.productCost" : "intake.finish.totalPaid")}
                  </FieldLabel>
                  <NumberInput
                    id="buy-total-paid"
                    min={0}
                    step={0.01}
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    {isOpenedProduct
                      ? t("intake.finish.productCostHint")
                      : isOverridden
                        ? t("intake.finish.totalPaidSpread", { offer: format(offeredTotal) })
                        : t("intake.finish.totalPaidHint")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          {showsMoney && isCustomer && (
            <div className="rounded-lg bg-foreground/6 p-3">
              <p className="text-xs text-foreground/70">
                {t(`intake.payoutTotal.${payoutMethod}`)}
              </p>
              <p className="text-2xl font-bold tabular-nums">{format(payout)}</p>
              {payoutMethod === "credit" && (
                <p className="text-xs text-foreground/70">
                  {t("intake.costBasisNote", { amount: format(cash) })}
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-foreground/70">
            {destination}
            {lot.ownsCollection && ` ${t("intake.finish.legacyMoveNote")}`}
          </p>
          {offersReceipt && (
            <Controller
              control={form.control}
              name="printReceipt"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="buy-print-receipt"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <label htmlFor="buy-print-receipt" className="text-control">
                    {t("intake.finish.printReceipt")}
                  </label>
                </div>
              )}
            />
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="buy-finish-form"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("intake.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
