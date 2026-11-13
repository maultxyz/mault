import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Pill } from "@/components/ui/pill";
import { Surface } from "@/components/ui/surface";
import { planConfigQueryOptions, savePricingMode } from "@/features/admin/api/plans-config";
import { SPACING } from "@/lib/constants/theme";

export function PlansPricingModeSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery(planConfigQueryOptions);
  const pricingModeMutation = useMutation({
    mutationFn: savePricingMode,
    onSuccess: (saved) => {
      queryClient.setQueryData(planConfigQueryOptions.queryKey, saved);
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      AccessibilityInfo.announceForAccessibility(t("admin.plans.pricingMode.saved"));
    },
  });

  if (!data) return null;

  const isLegacyPricingActive = data.isLegacyPricingActive;
  const pricingModeKey = isLegacyPricingActive ? "legacy" : "tiered";

  const confirmPricingModeSwitch = () => {
    Alert.alert(
      t(`admin.plans.pricingMode.${pricingModeKey}.confirmTitle`),
      t(`admin.plans.pricingMode.${pricingModeKey}.confirmDescription`),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t(`admin.plans.pricingMode.${pricingModeKey}.switch`),
          onPress: () => pricingModeMutation.mutate(!isLegacyPricingActive),
        },
      ],
    );
  };

  return (
    <Surface style={{ gap: SPACING.md }}>
      <View style={{ gap: SPACING.xs }}>
        <AppText heading weight="semibold" accessibilityRole="header">
          {t("admin.plans.pricingMode.heading")}
        </AppText>
        <Pill
          tone={isLegacyPricingActive ? "warning" : "success"}
          label={t(`admin.plans.pricingMode.${pricingModeKey}.badge`)}
        />
        <AppText size="xs" tone="secondary">
          {t(`admin.plans.pricingMode.${pricingModeKey}.description`)}
        </AppText>
      </View>
      {pricingModeMutation.isError ? (
        <Callout tone="destructive" title={t("admin.plans.pricingMode.saveFailed")} />
      ) : null}
      <Button
        variant="secondary"
        label={t(`admin.plans.pricingMode.${pricingModeKey}.switch`)}
        loading={pricingModeMutation.isPending}
        disabled={pricingModeMutation.isPending}
        onPress={confirmPricingModeSwitch}
      />
    </Surface>
  );
}
