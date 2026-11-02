import {
  billingPlanRowUsagePercent,
  billingPlanTableRows,
  LEGACY_BUSINESS_PLAN,
  type BillingPlanTableRow,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
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
  const isPaidPlan = !!billing && billing.plan !== "free";
  const planRows = billing ? billingPlanTableRows(billing) : [];
  const offeringText = (row: BillingPlanTableRow) => {
    if (row.kind === "feature") return t(row.included ? "settings.billing.planTable.included" : "settings.billing.planTable.notIncluded");
    if (row.limit == null) return t("settings.billing.planTable.unlimited");
    if (row.limit === 0) return t("settings.billing.planTable.notIncluded");
    return String(row.limit);
  };
  const usageText = (row: BillingPlanTableRow) => {
    if (row.used == null) return t("settings.billing.planTable.noUsage");
    return row.kind === "limit" && row.key === "dailyScans"
      ? t("settings.billing.planTable.usedToday", { count: row.used })
      : String(row.used);
  };

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
          <AppText size="lg" heading weight="bold">
            {t(`settings.billing.plan.${billing.isLegacyPlan ? LEGACY_BUSINESS_PLAN : billing.plan}`)}
          </AppText>
          {billing.isLegacyPlan ? <Callout tone="info" title={t("settings.billing.legacyPlanNote")} /> : null}
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: colors.muted }}>
              <AppText size="xs" weight="medium" tone="secondary" style={{ flex: 2 }}>
                {t("settings.billing.planTable.columns.offering")}
              </AppText>
              <AppText size="xs" weight="medium" tone="secondary" style={{ flex: 1 }}>
                {t("settings.billing.planTable.columns.yourPlan")}
              </AppText>
              <AppText size="xs" weight="medium" tone="secondary" style={{ flex: 1 }}>
                {t("settings.billing.planTable.columns.usage")}
              </AppText>
            </View>
            {planRows.map((row) => {
              const usagePercent = billingPlanRowUsagePercent(row);
              const unavailable = row.kind === "feature" ? !row.included : row.limit === 0;
              return (
                <View
                  key={`${row.kind}-${row.key}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <AppText size="sm" style={{ flex: 2 }}>
                    {t(`settings.billing.planTable.rows.${row.key}`)}
                  </AppText>
                  <AppText size="sm" tone={unavailable ? "secondary" : undefined} style={{ flex: 1, fontVariant: ["tabular-nums"] }}>
                    {offeringText(row)}
                  </AppText>
                  <View style={{ flex: 1, gap: SPACING.xs }}>
                    <AppText size="sm" tone={row.used == null ? "secondary" : undefined} style={{ fontVariant: ["tabular-nums"] }}>
                      {usageText(row)}
                    </AppText>
                    {usagePercent != null ? (
                      <View style={{ height: 4, borderRadius: RADIUS.full, backgroundColor: colors.muted }}>
                        <View style={{ width: `${usagePercent}%`, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.primary }} />
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
          {billing.cardsScannedThisMonth != null ? (
            <AppText size="xs" tone="secondary">
              {t("settings.billing.planTable.scansThisMonth", { count: billing.cardsScannedThisMonth })}
            </AppText>
          ) : null}
          {isPaidPlan && billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? (
            <AppText size="xs" tone="secondary">
              {t("settings.billing.cancelAtPeriodEnd", {
                date: new Date(billing.currentPeriodEnd).toLocaleDateString(i18n.language),
              })}
            </AppText>
          ) : null}
          <AppText size="xs" tone="secondary">
            {t("settings.billing.manageOnWeb")}
          </AppText>
        </Surface>
      )}
    </Screen>
  );
}
