import { LEGACY_BUSINESS_PLAN } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { billingQueryOptions } from "@/features/org/api/billing";
import { planFeatureLines } from "@/features/org/lib/plan-features";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";

export default function BillingSettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const org = useActiveOrg();
  const { data: billing, isPending, refetch, isRefetching } = useQuery(billingQueryOptions(org?.id ?? null));
  const isPaidPlan = !!billing && billing.plan !== "free";
  const features = billing ? planFeatureLines(t, billing) : [];
  const usagePercent =
    billing?.dailyLimit != null ? Math.min(100, Math.round((billing.cardsScannedToday / billing.dailyLimit) * 100)) : 0;

  return (
    <Screen
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={<PageHeader title={t("settings.sections.billing.title")} subtitle={org?.name} onBack={() => router.back()} />}
    >
      {isPending || !billing ? (
        <Skeleton height={240} />
      ) : (
        <Surface style={{ gap: SPACING.lg }}>
          <Pill tone={isPaidPlan ? "success" : "neutral"} label={t(`settings.billing.plan.${billing.isLegacyPlan ? LEGACY_BUSINESS_PLAN : billing.plan}`)} />
          {billing.isLegacyPlan ? <Callout tone="info" title={t("settings.billing.legacyPlanNote")} /> : null}
          {billing.dailyLimit != null ? (
            <View style={{ gap: SPACING.xs }}>
              <AppText size="xs" tone="secondary">
                {t("settings.billing.usage", { used: billing.cardsScannedToday, limit: billing.dailyLimit })}
              </AppText>
              <View style={{ height: 6, borderRadius: RADIUS.full, backgroundColor: colors.muted }}>
                <View style={{ width: `${usagePercent}%`, height: 6, borderRadius: RADIUS.full, backgroundColor: colors.primary }} />
              </View>
            </View>
          ) : null}
          {isPaidPlan && billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? (
            <AppText size="xs" tone="secondary">
              {t("settings.billing.cancelAtPeriodEnd", {
                date: new Date(billing.currentPeriodEnd).toLocaleDateString(i18n.language),
              })}
            </AppText>
          ) : null}
          <View style={{ gap: SPACING.sm }}>
            <AppText size="xs" weight="medium" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
              {t("settings.billing.includes")}
            </AppText>
            {features.map((feature) => (
              <View key={feature} style={{ flexDirection: "row", gap: SPACING.sm }}>
                <View style={{ marginTop: 2 }}>
                  <Icon name="check" size={16} color={colors.primaryText} />
                </View>
                <AppText style={{ flex: 1 }}>{feature}</AppText>
              </View>
            ))}
          </View>
          <AppText size="xs" tone="secondary">
            {t("settings.billing.manageOnWeb")}
          </AppText>
        </Surface>
      )}
    </Screen>
  );
}
