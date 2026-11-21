import { zodResolver } from "@hookform/resolvers/zod";
import {
  creditOfferFor,
  DEFAULT_BUYLIST_CONFIG,
  INTAKE_PAYOUT_METHODS,
  intakeAcceptSchema,
  type IntakeAcceptFormValues,
  type IntakePayoutMethod,
} from "@magic-vault/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { acceptIntakeLot, intakeLotQueryOptions } from "@/features/business/api/business";
import { businessSettingsQueryOptions } from "@/features/business/api/business-access";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function AcceptIntakeLotScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const { format } = usePricing();
  const { refresh, announce } = useBusinessAction();
  const lot = useQuery(intakeLotQueryOptions(guid)).data;
  const settings = useQuery(businessSettingsQueryOptions(orgId)).data?.settings;
  const buylist = settings?.buylist ?? DEFAULT_BUYLIST_CONFIG;
  const [overrideText, setOverrideText] = useState("");
  const form = useForm<IntakeAcceptFormValues>({
    resolver: zodResolver(intakeAcceptSchema),
    defaultValues: { payoutMethod: "cash", useOverride: false, totalOverride: null },
  });
  const payoutMethod = form.watch("payoutMethod");
  const useOverride = form.watch("useOverride");
  const totalOverride = form.watch("totalOverride");
  const cash =
    useOverride && totalOverride != null && Number.isFinite(totalOverride) ? totalOverride : (lot?.cashOffer ?? 0);
  const payout = payoutMethod === "credit" ? creditOfferFor(cash, buylist) : cash;

  const accept = useMutation({
    mutationFn: (values: IntakeAcceptFormValues) =>
      acceptIntakeLot(guid, {
        payoutMethod: values.payoutMethod,
        totalOverride: values.useOverride ? values.totalOverride : null,
      }),
    onSuccess: () => {
      router.back();
      announce(t("business.intake.accepted"), "success");
    },
    onSettled: () => void refresh(),
  });
  const submit = form.handleSubmit((values) => accept.mutate(values));

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("business.intake.acceptTitle")}
        subtitle={lot ? t("business.intake.acceptDescription", { count: lot.cardCount, name: lot.customerName }) : null}
      />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("business.intake.acceptConfirm", { amount: format(payout) })}
            loading={accept.isPending}
            disabled={!lot || lot.status !== "open"}
            onPress={() => void submit()}
          />
        }
      >
        {accept.isError ? (
          <Callout
            tone="destructive"
            title={accept.error instanceof Error ? accept.error.message : t("business.actionFailed")}
          />
        ) : null}
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
        <SwitchRow
          title={t("business.intake.overrideLabel")}
          value={useOverride}
          onValueChange={(value) => {
            form.setValue("useOverride", value);
            if (value && lot?.cashOffer != null && !overrideText) {
              setOverrideText(String(lot.cashOffer));
              form.setValue("totalOverride", lot.cashOffer);
            }
          }}
        />
        {useOverride ? (
          <Controller
            control={form.control}
            name="totalOverride"
            render={({ field, fieldState }) => (
              <TextField
                label={t("business.intake.overrideAmount")}
                keyboardType="decimal-pad"
                value={overrideText}
                onBlur={field.onBlur}
                onChangeText={(text) => {
                  setOverrideText(text);
                  const normalized = text.trim().replace(",", ".");
                  field.onChange(normalized === "" ? null : Number(normalized));
                }}
                error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
              />
            )}
          />
        ) : null}
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
      </PinnedActionsLayout>
    </View>
  );
}
