import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  cardSellPrice,
  EMPTY_CARD_SELL_RULE,
  PRICE_LABEL_ROUNDING_MODES,
  PRICE_SOURCE_FIELDS,
  toSellPriceConfig,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { DecimalTextField } from "@/components/ui/decimal-text-field";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Surface } from "@/components/ui/surface";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { usePricing } from "@/hooks/use-pricing";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { SELL_PRICE_PREVIEW_MARKET_PRICE } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessSettingsFormProps } from "@/lib/interfaces/business";

export function SellPriceSettings({ control, disabled }: BusinessSettingsFormProps) {
  const { t } = useTranslation();
  const { format, source } = usePricing();
  const sell = toSellPriceConfig(useWatch({ control, name: "sell" }));
  const previewPrice = cardSellPrice(
    SELL_PRICE_PREVIEW_MARKET_PRICE,
    EMPTY_CARD_SELL_RULE,
    sell,
    PRICE_SOURCE_FIELDS[source].currency,
  );

  return (
    <SettingsSection title={t("settings.pricing.selling.heading")} description={t("settings.pricing.selling.description")}>
      <Surface style={{ gap: SPACING.xs }}>
        <Controller
          control={control}
          name="sell.defaultMarkupPercent"
          render={({ field, fieldState }) => (
            <DecimalTextField
              label={t("settings.pricing.selling.defaultMargin")}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              editable={!disabled}
              allowsNegative
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
        <AppText size="xs" tone="secondary">
          {t("settings.pricing.selling.defaultMarginHint")}
        </AppText>
      </Surface>
      <AppText size="sm" weight="medium">
        {t("settings.pricing.selling.rounding")}
      </AppText>
      <Controller
        control={control}
        name="sell.rounding"
        render={({ field }) => (
          <ListGroup>
            {PRICE_LABEL_ROUNDING_MODES.map((mode) => (
              <ListRow
                key={mode}
                title={t(`settings.pricing.selling.roundingModes.${mode}`)}
                selected={field.value === mode}
                disabled={disabled}
                onPress={() => field.onChange(mode)}
              />
            ))}
          </ListGroup>
        )}
      />
      {previewPrice != null ? (
        <AppText size="xs" tone="secondary">
          {t("settings.pricing.selling.preview", {
            market: format(SELL_PRICE_PREVIEW_MARKET_PRICE),
            price: format(previewPrice),
          })}
        </AppText>
      ) : null}
    </SettingsSection>
  );
}
