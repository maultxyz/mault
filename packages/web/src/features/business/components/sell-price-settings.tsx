import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberInput } from "@/features/business/components/number-input";
import { usePriceSource } from "@/hooks/use-price-source";
import { SELL_PRICE_PREVIEW_MARKET_PRICES } from "@/lib/constants/business";
import type { SellPriceSettingsProps } from "@/lib/interfaces/business";
import {
  cardSellPrice,
  EMPTY_CARD_SELL_RULE,
  PRICE_LABEL_ROUNDING_MODES,
  toSellPriceConfig,
  type PriceLabelRoundingMode,
} from "@magic-vault/shared";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function SellPriceSettings({ control, disabled }: SellPriceSettingsProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const sellConfig = toSellPriceConfig(useWatch({ control, name: "sell" }));

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-wrap items-start gap-4 md:gap-3">
        <Controller
          control={control}
          name="sell.defaultMarkupPercent"
          render={({ field, fieldState }) => (
            <Field className="w-40" data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="sell-default-markup">
                {t("settings.sell.defaultMarkup")}
              </FieldLabel>
              <NumberInput
                id="sell-default-markup"
                step={1}
                disabled={disabled}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
                aria-describedby="sell-default-markup-hint"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="sell.rounding"
          render={({ field }) => (
            <Field className="w-64 max-w-full">
              <FieldLabel htmlFor="sell-rounding">{t("settings.sell.rounding")}</FieldLabel>
              <Select
                value={field.value}
                disabled={disabled}
                onValueChange={(value) => {
                  if (value) field.onChange(value as PriceLabelRoundingMode);
                }}
              >
                <SelectTrigger id="sell-rounding" className="w-full">
                  <SelectValue>{t(`settings.sell.roundingModes.${field.value}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRICE_LABEL_ROUNDING_MODES.map((rounding) => (
                    <SelectItem key={rounding} value={rounding}>
                      {t(`settings.sell.roundingModes.${rounding}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      </div>
      <p id="sell-default-markup-hint" className="text-xs text-foreground/70">
        {t("settings.sell.defaultMarkupHint")}
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t("settings.sell.preview")}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
          {SELL_PRICE_PREVIEW_MARKET_PRICES.map((marketPrice) => (
            <li key={marketPrice} className="tabular-nums">
              {t("settings.sell.previewItem", {
                market: format(marketPrice),
                price: format(cardSellPrice(marketPrice, EMPTY_CARD_SELL_RULE, sellConfig, "") ?? 0),
              })}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
