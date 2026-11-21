import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatMonthlyRecurringRevenue } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { StatTileSkeleton } from "@/components/ui/stat-tile-skeleton";
import { subscriptionSummaryQueryOptions } from "@/features/admin/api/subscription-summary";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useCompactCount } from "@/hooks/use-compact-count";
import { SPACING } from "@/lib/constants/theme";

export function SubscriptionSummaryPanel() {
  const { t, i18n } = useTranslation();
  const compactCount = useCompactCount();
  const summaryQuery = useQuery(subscriptionSummaryQueryOptions);
  const summary = summaryQuery.data;
  const planName = (plan: string) => t(`settings.billing.plan.${plan}`);

  if (summary && !summary.billingEnabled) return null;

  return (
    <SettingsSection title={t("admin.plans.subscriptions.heading")} description={t("admin.plans.subscriptions.description")}>
      {summaryQuery.isPending ? (
        <StatGroup>
          <StatTileSkeleton />
          <StatTileSkeleton />
        </StatGroup>
      ) : !summary ? (
        <Callout tone="destructive" title={t("admin.plans.subscriptions.loadFailed")} />
      ) : (
        <View style={{ gap: SPACING.md }}>
          {summary.unpricedSubscriberCount > 0 ? (
            <Callout
              tone="warning"
              title={t("admin.plans.subscriptions.unpriced", { count: summary.unpricedSubscriberCount })}
            />
          ) : null}
          <StatGroup heading={t("admin.plans.subscriptions.subscribersHeading")}>
            {summary.tiers.map((tier) => (
              <StatTile
                key={tier.plan}
                label={planName(tier.plan)}
                {...compactCount(tier.subscriberCount)}
                hint={
                  tier.trialingSubscriberCount > 0
                    ? t("admin.plans.subscriptions.trialingCount", { count: tier.trialingSubscriberCount })
                    : undefined
                }
              />
            ))}
            <StatTile label={t("admin.plans.subscriptions.total")} {...compactCount(summary.totalSubscriberCount)} />
          </StatGroup>
          <StatGroup heading={t("admin.plans.subscriptions.revenueHeading")}>
            {summary.tiers.map((tier) => (
              <StatTile
                key={tier.plan}
                label={planName(tier.plan)}
                value={formatMonthlyRecurringRevenue(tier.monthlyRecurringRevenue, i18n.language)}
              />
            ))}
            <StatTile
              label={t("admin.plans.subscriptions.total")}
              value={formatMonthlyRecurringRevenue(summary.totalMonthlyRecurringRevenue, i18n.language)}
            />
          </StatGroup>
        </View>
      )}
    </SettingsSection>
  );
}
