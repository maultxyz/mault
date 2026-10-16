import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";

export default function BillingSettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const org = useActiveOrg();
  const { data: billing, isPending, refetch, isRefetching } = useQuery(billingQueryOptions(org?.id ?? null));
  const isBusiness = billing?.plan === "business";
  const f = (key: string, options?: Record<string, unknown>) => t(`settings.billing.features.${key}`, options);
  const features = billing
    ? [
        billing.dailyLimit == null ? f("unlimitedScans") : f("scanLimit", { limit: billing.dailyLimit }),
        billing.maxConnectedSorters != null
          ? f(isBusiness ? "businessSorters" : "freeSorters", { count: billing.maxConnectedSorters })
          : null,
        billing.maxSoundRules == null ? f("soundRules") : f("freeSoundRules", { count: billing.maxSoundRules }),
        billing.maxNotificationRules == null
          ? f("notificationRules")
          : f("freeNotificationRules", { count: billing.maxNotificationRules }),
        billing.chaosSort ? f("chaosSort") : null,
        billing.storage ? f("storage") : null,
        billing.apiAccess ? f("apiAccess") : null,
        f("collections"),
        f("games"),
        f("notifications"),
      ].filter((feature): feature is string => !!feature)
    : [];
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
          <Pill tone={isBusiness ? "success" : "neutral"} label={t(`settings.billing.plan.${billing.plan}`)} />
          {!isBusiness && billing.dailyLimit != null ? (
            <View style={{ gap: SPACING.xs }}>
              <AppText size="xs" tone="secondary">
                {t("settings.billing.usage", { used: billing.cardsScannedToday, limit: billing.dailyLimit })}
              </AppText>
              <View style={{ height: 6, borderRadius: RADIUS.full, backgroundColor: colors.muted }}>
                <View style={{ width: `${usagePercent}%`, height: 6, borderRadius: RADIUS.full, backgroundColor: colors.primary }} />
              </View>
            </View>
          ) : null}
          {isBusiness && billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? (
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
