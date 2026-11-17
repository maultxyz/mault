import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumberInput } from "@/features/business/components/number-input";
import { usePriceSource } from "@/hooks/use-price-source";
import { BUYLIST_PREVIEW_PRICES } from "@/lib/constants/business";
import type { BuylistSettingsProps } from "@/lib/interfaces/business";
import {
  BUYLIST_TIERS_MAX,
  buylistOfferFor,
  creditOfferFor,
  isBelowBuylistMinimum,
  toBuylistConfig,
} from "@magic-vault/shared";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function BuylistSettings({ control, disabled }: BuylistSettingsProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "buylist.tiers",
  });
  const buylist = toBuylistConfig(useWatch({ control, name: "buylist" }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("settings.buylist.tiers")}</p>
        <div className="divide-y rounded-lg border">
          {fields.map((tier, index) => (
            <div key={tier.id} className="flex items-start gap-3 px-3 py-2">
              <Controller
                control={control}
                name={`buylist.tiers.${index}.minPrice`}
                render={({ field, fieldState }) => (
                  <Field
                    className="flex-1"
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor={`tier-min-${tier.id}`}>
                      {t("settings.buylist.minPrice")}
                    </FieldLabel>
                    <NumberInput
                      id={`tier-min-${tier.id}`}
                      min={0}
                      step={0.01}
                      disabled={disabled}
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={control}
                name={`buylist.tiers.${index}.percent`}
                render={({ field, fieldState }) => (
                  <Field
                    className="flex-1"
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor={`tier-percent-${tier.id}`}>
                      {t("settings.buylist.percent")}
                    </FieldLabel>
                    <NumberInput
                      id={`tier-percent-${tier.id}`}
                      min={0}
                      max={100}
                      step={1}
                      disabled={disabled}
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Button
                variant="ghost"
                size="icon"
                className="mt-5"
                aria-label={t("settings.buylist.removeTier")}
                title={t("settings.buylist.removeTier")}
                disabled={disabled || fields.length <= 1}
                onClick={() => remove(index)}
              >
                <IconTrash />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="self-start"
          disabled={disabled || fields.length >= BUYLIST_TIERS_MAX}
          onClick={() => append({ minPrice: 0, percent: 50 })}
        >
          <IconPlus />
          {t("settings.buylist.addTier")}
        </Button>
        <p className="text-xs text-foreground/70">
          {t("settings.buylist.tiersHint")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="buylist.minCardValue"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="buylist-min-value">
                {t("settings.buylist.minCardValue")}
              </FieldLabel>
              <NumberInput
                id="buylist-min-value"
                min={0}
                step={0.01}
                disabled={disabled}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
              <p className="text-xs text-foreground/70">
                {t("settings.buylist.minCardValueHint")}
              </p>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="buylist.bulkThreshold"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="buylist-bulk-threshold">
                {t("settings.buylist.bulkThreshold")}
              </FieldLabel>
              <NumberInput
                id="buylist-bulk-threshold"
                min={0}
                step={0.01}
                disabled={disabled}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="buylist.bulkOffer"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="buylist-bulk-offer">
                {t("settings.buylist.bulkOffer")}
              </FieldLabel>
              <NumberInput
                id="buylist-bulk-offer"
                min={0}
                step={0.01}
                disabled={disabled}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="buylist.creditBonusPercent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="buylist-credit-bonus">
                {t("settings.buylist.creditBonus")}
              </FieldLabel>
              <NumberInput
                id="buylist-credit-bonus"
                min={0}
                step={1}
                disabled={disabled}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("settings.buylist.preview")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUYLIST_PREVIEW_PRICES.map((price) => {
            const cash = buylistOfferFor(price, buylist);
            const declined = isBelowBuylistMinimum(price, buylist);
            return (
              <div key={price} className="rounded-md border p-2">
                <p className="text-xs text-foreground/70">
                  {t("settings.buylist.previewMarket", {
                    price: format(price),
                  })}
                </p>
                {declined ? (
                  <p className="text-sm font-semibold text-foreground/70 line-through">
                    {t("settings.buylist.previewDeclined")}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold tabular-nums">
                      {format(cash)}
                    </p>
                    <p className="text-2xs text-foreground/70">
                      {t("settings.buylist.previewCredit", {
                        price: format(creditOfferFor(cash, buylist)),
                      })}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
