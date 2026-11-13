import {
  billingPlanRowUsagePercent,
  billingPlanTableRows,
  LEGACY_BUSINESS_PLAN,
  type BillingPlanTableRow,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { billingQueryOptions } from "@/features/org/api/billing";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

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
    <SettingsPage
      title={t("settings.sections.billing.title")}
      isLoading={isPending || !billing}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    >
      {billing ? (
        <>
          <View style={{ gap: SPACING.xs }}>
            <AppText size="xs" tone="secondary">
              {t("settings.billing.planTable.columns.yourPlan")}
            </AppText>
            <AppText size="xl" heading weight="bold">
              {t(`settings.billing.plan.${billing.isLegacyPlan ? LEGACY_BUSINESS_PLAN : billing.plan}`)}
            </AppText>
          </View>
          {billing.isLegacyPlan ? <Callout tone="info" title={t("settings.billing.legacyPlanNote")} /> : null}
          {isPaidPlan && billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? (
            <Callout
              tone="info"
              title={t("settings.billing.cancelAtPeriodEnd", {
                date: new Date(billing.currentPeriodEnd).toLocaleDateString(i18n.language),
              })}
            />
          ) : null}
          <SettingsSection
            title={t("settings.billing.planTable.columns.offering")}
            description={
              billing.cardsScannedThisMonth != null
                ? t("settings.billing.planTable.scansThisMonth", { count: billing.cardsScannedThisMonth })
                : undefined
            }
          >
            <ListGroup>
              {planRows.map((row, index) => {
                const usagePercent = billingPlanRowUsagePercent(row);
                const unavailable = row.kind === "feature" ? !row.included : row.limit === 0;
                const rowName = t(`settings.billing.planTable.rows.${row.key}`);
                const usageLine = `${t("settings.billing.planTable.columns.usage")} · ${usageText(row)}`;
                return (
                  <View
                    key={`${row.kind}-${row.key}`}
                    accessible
                    accessibilityLabel={`${rowName}, ${offeringText(row)}, ${usageLine}`}
                    style={{
                      gap: SPACING.xs,
                      paddingHorizontal: SCREEN_GUTTER,
                      paddingVertical: SPACING.sm,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                      <AppText weight="medium" style={{ flex: 1, minWidth: 0 }}>
                        {rowName}
                      </AppText>
                      <AppText tone={unavailable ? "secondary" : undefined}>
                        {offeringText(row)}
                      </AppText>
                    </View>
                    {row.used != null ? (
                      <AppText size="xs" tone="secondary">
                        {usageLine}
                      </AppText>
                    ) : null}
                    {usagePercent != null ? (
                      <View style={{ height: 4, borderRadius: RADIUS.full, backgroundColor: colors.muted }}>
                        <View style={{ width: `${usagePercent}%`, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.primary }} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ListGroup>
          </SettingsSection>
          <AppText size="xs" tone="secondary">
            {t("settings.billing.manageOnWeb")}
          </AppText>
        </>
      ) : null}
    </SettingsPage>
  );
}
