import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import {
  type CardSellPriceRequest,
  SELL_PRICE_MODES,
  sellPriceFormSchema,
  type SellPriceFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { DecimalTextField } from "@/components/ui/decimal-text-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { setCardSellPrice } from "@/features/business/api/card-pricing";
import { sellPriceFormValuesOf, signedPercentText } from "@/features/business/lib/card-sell-rule";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { BUSINESS_CARD_PRICING_QUERY_KEY } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { CardSellPriceSheetProps } from "@/lib/interfaces/business";

export function CardSellPriceSheet({ visible, pricing, onClose }: CardSellPriceSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const form = useForm<SellPriceFormValues>({
    resolver: zodResolver(sellPriceFormSchema),
    defaultValues: sellPriceFormValuesOf(pricing),
  });
  const mode = form.watch("mode");

  const save = useMutation({
    mutationFn: (values: SellPriceFormValues) => {
      const request: CardSellPriceRequest =
        values.mode === "fixed"
          ? { scanIds: [pricing.scanId], mode: "fixed", fixedPrice: values.fixedPrice }
          : values.mode === "markup"
            ? { scanIds: [pricing.scanId], mode: "markup", markupPercent: values.markupPercent }
            : { scanIds: [pricing.scanId], mode: "default" };
      return setCardSellPrice(request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BUSINESS_CARD_PRICING_QUERY_KEY });
      AccessibilityInfo.announceForAccessibility(t("cardDetail.pricing.sellPriceSaved"));
      onClose();
    },
  });

  const { reset: resetForm } = form;
  const { reset: resetSave } = save;
  useEffect(() => {
    if (!visible) return;
    resetForm(sellPriceFormValuesOf(pricing));
    resetSave();
  }, [visible, pricing, resetForm, resetSave]);

  const changeMode = (nextMode: SellPriceFormValues["mode"]) => {
    form.setValue("mode", nextMode, { shouldDirty: true });
    const fallback = sellPriceFormValuesOf(pricing);
    if (form.getValues("markupPercent") == null) form.setValue("markupPercent", fallback.markupPercent);
    if (form.getValues("fixedPrice") == null) form.setValue("fixedPrice", fallback.fixedPrice);
    form.clearErrors();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("cardDetail.pricing.sellPriceTitle")}
      description={t("cardDetail.pricing.sellPriceDescription")}
      footer={
        <Button
          size="lg"
          label={t("common.save")}
          loading={save.isPending}
          onPress={() => void form.handleSubmit((values) => save.mutate(values))()}
        />
      }
    >
      <View style={{ gap: SPACING.md }}>
        {save.isError ? <Callout tone="destructive" title={t("cardDetail.pricing.sellPriceSaveFailed")} /> : null}
        <SegmentedControl
          options={SELL_PRICE_MODES.map((value) => ({ value, label: t(`cardDetail.pricing.modes.${value}`) }))}
          value={mode}
          onChange={changeMode}
        />
        {mode === "default" ? (
          <AppText size="sm" tone="secondary">
            {t("cardDetail.pricing.defaultModeHint", { percent: signedPercentText(pricing.defaultMarkupPercent) })}
          </AppText>
        ) : mode === "markup" ? (
          <Controller
            control={form.control}
            name="markupPercent"
            render={({ field, fieldState }) => (
              <DecimalTextField
                label={t("cardDetail.pricing.markupPercent")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                allowsNegative
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
        ) : (
          <Controller
            control={form.control}
            name="fixedPrice"
            render={({ field, fieldState }) => (
              <DecimalTextField
                label={t("cardDetail.pricing.fixedPrice", { currency: pricing.currency })}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
        )}
      </View>
    </Sheet>
  );
}
