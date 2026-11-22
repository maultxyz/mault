import { Callout } from "@/components/callout";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection } from "@/components/settings-section";
import { StatGroup } from "@/components/stat-group";
import { subscriptionSummaryQueryOptions } from "@/features/admin/api/subscription-summary";
import {
  formatMonthlyRecurringRevenue,
  SUBSCRIPTION_SUMMARY_PLAN_KEYS,
  type MonthlyRecurringRevenue,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function SubscriptionSummaryPanel() {
  const { t, i18n } = useTranslation("admin");
  const summaryQuery = useQuery(subscriptionSummaryQueryOptions);
  const summary = summaryQuery.data;

  if (summary && !summary.billingEnabled) return null;

  const shownTiers =
    summary?.tiers ??
    SUBSCRIPTION_SUMMARY_PLAN_KEYS.filter(
      (plan) => plan !== "legacyBusiness",
    ).map((plan) => ({
      plan,
      subscriberCount: undefined,
      trialingSubscriberCount: 0,
      monthlyRecurringRevenue: undefined,
    }));
  const formatRevenue = (revenue: MonthlyRecurringRevenue[] | undefined) =>
    revenue ? formatMonthlyRecurringRevenue(revenue, i18n.language) : null;

  const subscriberTiles = [
    ...shownTiers.map((tier) => ({
      key: tier.plan,
      label: t(`plans.planNames.${tier.plan}`),
      value: tier.subscriberCount,
      detail:
        tier.trialingSubscriberCount > 0
          ? t("subscriptionSummary.trialingCount", {
              count: tier.trialingSubscriberCount,
            })
          : undefined,
    })),
    {
      key: "total",
      label: t("subscriptionSummary.total"),
      value: summary?.totalSubscriberCount,
      detail: undefined,
    },
  ];

  const revenueTiles = [
    ...shownTiers.map((tier) => ({
      key: tier.plan,
      label: t(`plans.planNames.${tier.plan}`),
      value: formatRevenue(tier.monthlyRecurringRevenue),
    })),
    {
      key: "total",
      label: t("subscriptionSummary.total"),
      value: formatRevenue(summary?.totalMonthlyRecurringRevenue),
    },
  ];

  const gridClassName =
    shownTiers.length > 2
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3";

  return (
    <SettingsSection
      heading={t("subscriptionSummary.heading")}
      description={t("subscriptionSummary.description")}
    >
      <div className="flex flex-col gap-3 md:gap-2">
        {summaryQuery.isError && !summary && (
          <LoadErrorCallout
            message={t("subscriptionSummary.loadFailed")}
            onRetry={() => void summaryQuery.refetch()}
          />
        )}
        {summary && summary.unpricedSubscriberCount > 0 && (
          <Callout variant="warning">
            {t("subscriptionSummary.unpriced", {
              count: summary.unpricedSubscriberCount,
            })}
          </Callout>
        )}
        <StatGroup
          heading={t("subscriptionSummary.subscribersHeading")}
          tiles={subscriberTiles}
          gridClassName={gridClassName}
        />
        <StatGroup
          heading={t("subscriptionSummary.revenueHeading")}
          tiles={revenueTiles}
          gridClassName={gridClassName}
        />
      </div>
    </SettingsSection>
  );
}
