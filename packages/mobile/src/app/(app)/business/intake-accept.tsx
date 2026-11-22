import { zodResolver } from "@hookform/resolvers/zod";
import {
  businessMoneySchema,
  creditOfferFor,
  DEFAULT_BUYLIST_CONFIG,
  INTAKE_PAYOUT_METHODS,
  intakeAcceptSchema,
  type IntakeAcceptFormValues,
  type IntakePayoutMethod,
} from "@magic-vault/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { acceptIntakeLot, intakeLotQueryOptions } from "@/features/business/api/business";
import { businessSettingsQueryOptions } from "@/features/business/api/business-access";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function FinishBuyScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const { format } = usePricing();
  const { refresh, announce } = useBusinessAction();
  const lot = useQuery(intakeLotQueryOptions(guid)).data;
  const settings = useQuery(businessSettingsQueryOptions(orgId)).data?.settings;
  const buylist = settings?.buylist ?? DEFAULT_BUYLIST_CONFIG;
  const [totalText, setTotalText] = useState("");
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const form = useForm<IntakeAcceptFormValues>({
    resolver: zodResolver(intakeAcceptSchema),
    mode: "onTouched",
    defaultValues: { payoutMethod: "cash", useOverride: true, totalOverride: null },
  });
  const isCustomerBuy = lot?.sourceType === "customer";
  const isOpenedProduct = lot?.sourceType === "opened";
  const payoutMethod: IntakePayoutMethod = isCustomerBuy ? form.watch("payoutMethod") : "cash";
  const totalOverride = form.watch("totalOverride");
  const cash = totalOverride != null && Number.isFinite(totalOverride) ? totalOverride : (lot?.cashOffer ?? 0);
  const payout = payoutMethod === "credit" ? creditOfferFor(cash, buylist) : cash;
  const hasValidProductCost = totalOverride != null && businessMoneySchema.safeParse(totalOverride).success;

  useEffect(() => {
    if (hasPrefilled || !lot) return;
    setHasPrefilled(true);
    if (lot.sourceType !== "opened" && lot.cashOffer != null) {
      setTotalText(String(lot.cashOffer));
      form.setValue("totalOverride", lot.cashOffer);
    }
  }, [lot, hasPrefilled, form]);

  const finish = useMutation({
    mutationFn: (values: IntakeAcceptFormValues) =>
      acceptIntakeLot(guid, {
        payoutMethod: isCustomerBuy ? values.payoutMethod : "cash",
        totalOverride: values.totalOverride,
      }),
    onSuccess: () => {
      router.back();
      announce(t("business.intake.accepted"), "success");
    },
    onSettled: () => void refresh(),
  });
  const submit = form.handleSubmit((values) => finish.mutate(values));
  const destination = !lot
    ? null
    : lot.ownsCollection
      ? t("business.buy.finishDestinationLegacy", { collection: lot.collectionName })
      : lot.destinationLocationName
        ? t("business.buy.finishDestinationLocation", {
            collection: lot.collectionName,
            location: lot.destinationLocationName,
          })
        : t("business.buy.finishDestination", { collection: lot.collectionName });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("business.buy.finishTitle")}
        subtitle={
          lot
            ? t(isOpenedProduct ? "business.buy.finishDescriptionOpened" : "business.buy.finishDescription", {
                count: lot.cardCount,
                name: lot.customerName,
              })
            : null
        }
      />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={
              isOpenedProduct && !hasValidProductCost
                ? t("business.buy.finish")
                : t("business.buy.finishConfirm", { amount: format(payout) })
            }
            loading={finish.isPending}
            disabled={!lot || lot.status !== "open" || (isOpenedProduct && !hasValidProductCost)}
            onPress={() => void submit()}
          />
        }
      >
        {finish.isError ? (
          <Callout
            tone="destructive"
            title={finish.error instanceof Error ? finish.error.message : t("business.actionFailed")}
          />
        ) : null}
        {isCustomerBuy ? (
          <View style={{ gap: SPACING.xs }}>
            <AppText size="sm" weight="medium">
              {t("business.intake.payoutMethod")}
            </AppText>
            <SegmentedControl<IntakePayoutMethod>
              value={payoutMethod}
              onChange={(value) => form.setValue("payoutMethod", value)}
              options={INTAKE_PAYOUT_METHODS.map((value) => ({ value, label: t(`business.intake.payout.${value}`) }))}
            />
          </View>
        ) : null}
        <Controller
          control={form.control}
          name="totalOverride"
          render={({ field, fieldState }) => (
            <View style={{ gap: SPACING.xs }}>
              <TextField
                label={t(isOpenedProduct ? "business.buy.productCost" : "business.buy.totalPaid")}
                keyboardType="decimal-pad"
                value={totalText}
                onBlur={field.onBlur}
                onChangeText={(text) => {
                  setTotalText(text);
                  const normalized = text.trim().replace(",", ".");
                  field.onChange(normalized === "" ? null : Number(normalized));
                }}
                error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
              />
              <AppText size="xs" tone="secondary">
                {t(isOpenedProduct ? "business.buy.productCostHint" : "business.buy.totalPaidHint")}
              </AppText>
            </View>
          )}
        />
        {isOpenedProduct ? (
          lot?.marketTotal != null ? (
            <Surface>
              <View style={{ gap: SPACING.xs }} accessible>
                <AppText size="xs" tone="secondary">
                  {t("business.intake.stats.market")}
                </AppText>
                <AppText size="3xl" heading weight="bold">
                  {format(lot.marketTotal)}
                </AppText>
              </View>
            </Surface>
          ) : null
        ) : (
          <Surface>
            <View style={{ gap: SPACING.xs }} accessible accessibilityLiveRegion="polite">
              <AppText size="xs" tone="secondary">
                {t(`business.intake.payoutTotal.${payoutMethod}`)}
              </AppText>
              <AppText size="3xl" heading weight="bold">
                {format(payout)}
              </AppText>
              <AppText size="xs" tone="secondary">
                {t("business.intake.costBasisNote", { amount: format(cash) })}
              </AppText>
            </View>
          </Surface>
        )}
        {destination ? (
          <Callout tone="info" title={t("business.buy.finishDestinationTitle")} description={destination} />
        ) : null}
      </PinnedActionsLayout>
    </View>
  );
}
