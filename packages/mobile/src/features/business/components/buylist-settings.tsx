import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  BUYLIST_PREVIEW_PRICES,
  BUYLIST_TIERS_MAX,
  buylistOfferFor,
  creditOfferFor,
  isBelowBuylistMinimum,
  toBuylistConfig,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { DecimalTextField } from "@/components/ui/decimal-text-field";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { NumberTextField } from "@/components/ui/number-text-field";
import { Surface } from "@/components/ui/surface";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { usePricing } from "@/hooks/use-pricing";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessSettingsFormProps } from "@/lib/interfaces/business";

export function BuylistSettings({ control, disabled }: BusinessSettingsFormProps) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const { fields, append, remove } = useFieldArray({ control, name: "buylist.tiers" });
  const buylist = toBuylistConfig(useWatch({ control, name: "buylist" }));

  return (
    <>
      <SettingsSection title={t("settings.pricing.buying.heading")} description={t("settings.pricing.buying.description")}>
        <AppText size="sm" weight="medium">
          {t("settings.business.buylist.tiers")}
        </AppText>
        <Surface style={{ gap: SPACING.md }}>
          {fields.map((tier, index) => (
            <View key={tier.id} style={{ flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Controller
                  control={control}
                  name={`buylist.tiers.${index}.minPrice`}
                  render={({ field, fieldState }) => (
                    <DecimalTextField
                      label={t("settings.business.buylist.minPrice")}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      editable={!disabled}
                      error={translateFormErrorMessage(t, fieldState.error?.message)}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Controller
                  control={control}
                  name={`buylist.tiers.${index}.percent`}
                  render={({ field, fieldState }) => (
                    <NumberTextField
                      label={t("settings.business.buylist.percent")}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      editable={!disabled}
                      error={translateFormErrorMessage(t, fieldState.error?.message)}
                    />
                  )}
                />
              </View>
              <IconButton
                icon="trash"
                variant="plain"
                accessibilityLabel={t("settings.business.buylist.removeTier")}
                disabled={disabled || fields.length <= 1}
                onPress={() => remove(index)}
              />
            </View>
          ))}
        </Surface>
        <ListGroup>
          <ListRow
            icon="plus"
            title={t("settings.business.buylist.addTier")}
            disabled={disabled || fields.length >= BUYLIST_TIERS_MAX}
            onPress={() => append({ minPrice: 0, percent: 50 })}
          />
        </ListGroup>
        <AppText size="xs" tone="secondary">
          {t("settings.business.buylist.tiersHint")}
        </AppText>
        <Surface style={{ gap: SPACING.md }}>
          <Controller
            control={control}
            name="buylist.minCardValue"
            render={({ field, fieldState }) => (
              <View style={{ gap: SPACING.xs }}>
                <DecimalTextField
                  label={t("settings.business.buylist.minCardValue")}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  editable={!disabled}
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
                <AppText size="xs" tone="secondary">
                  {t("settings.business.buylist.minCardValueHint")}
                </AppText>
              </View>
            )}
          />
          <Controller
            control={control}
            name="buylist.bulkThreshold"
            render={({ field, fieldState }) => (
              <DecimalTextField
                label={t("settings.business.buylist.bulkThreshold")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                editable={!disabled}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="buylist.bulkOffer"
            render={({ field, fieldState }) => (
              <DecimalTextField
                label={t("settings.business.buylist.bulkOffer")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                editable={!disabled}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="buylist.creditBonusPercent"
            render={({ field, fieldState }) => (
              <NumberTextField
                label={t("settings.business.buylist.creditBonus")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                editable={!disabled}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
        </Surface>
      </SettingsSection>
      <SettingsSection title={t("settings.business.buylist.preview")}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {BUYLIST_PREVIEW_PRICES.map((price) => {
            const cash = buylistOfferFor(price, buylist);
            const declined = isBelowBuylistMinimum(price, buylist);
            return (
              <View key={price} style={{ flexBasis: "45%", flexGrow: 1 }}>
                <Surface style={{ gap: 2 }}>
                  <AppText size="xs" tone="secondary">
                    {t("settings.business.buylist.previewMarket", { price: format(price) })}
                  </AppText>
                  {declined ? (
                    <AppText weight="semibold" tone="secondary" style={{ textDecorationLine: "line-through" }}>
                      {t("settings.business.buylist.previewDeclined")}
                    </AppText>
                  ) : (
                    <>
                      <AppText weight="semibold">{format(cash)}</AppText>
                      <AppText size="xs" tone="secondary">
                        {t("settings.business.buylist.previewCredit", { price: format(creditOfferFor(cash, buylist)) })}
                      </AppText>
                    </>
                  )}
                </Surface>
              </View>
            );
          })}
        </View>
      </SettingsSection>
    </>
  );
}
