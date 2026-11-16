import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { TabStrip } from "@/components/ui/tab-strip";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { IntakeLotsView } from "@/features/business/components/intake-lots-view";
import { OrdersView } from "@/features/business/components/orders-view";
import { useActiveOrgId } from "@/hooks/use-org";
import { BUSINESS_INTAKE_VIEW, BUSINESS_QUERY_KEY, BUSINESS_PICKS_VIEW, BUSINESS_VIEWS } from "@/lib/constants/business";
import type { BusinessHubProps, BusinessView } from "@/lib/interfaces/business";

export function BusinessHub({ onBack }: BusinessHubProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<BusinessView>(viewParam === BUSINESS_PICKS_VIEW ? BUSINESS_PICKS_VIEW : BUSINESS_INTAKE_VIEW);
  const access = useQuery(businessAccessQueryOptions(orgId));
  const isLocked = !!access.data?.isLocked;
  const canCreateIntake = !!access.data && !isLocked;
  const canCreatePick = !!access.data?.canFulfilOrders && !isLocked;
  const isIntake = view === BUSINESS_INTAKE_VIEW;

  return (
    <Screen
      onRefresh={() => queryClient.invalidateQueries({ queryKey: BUSINESS_QUERY_KEY })}
      header={
        <PageHeader
          title={t("business.title")}
          subtitle={t("business.subtitle")}
          onBack={onBack}
          actions={
            (isIntake ? canCreateIntake : canCreatePick) ? (
              <IconButton
                icon="plus"
                accessibilityLabel={isIntake ? t("business.intake.new") : t("business.picks.new")}
                onPress={() => router.push(isIntake ? "/business/intake-new" : "/business/pick-new")}
              />
            ) : null
          }
          tabs={
            <TabStrip<BusinessView>
              value={view}
              onChange={setView}
              items={BUSINESS_VIEWS.map((value) => ({ value, label: t(`business.views.${value}`) }))}
            />
          }
        />
      }
    >
      {isLocked ? <Callout tone="info" title={t("business.locked")} description={t("business.lockedDescription")} /> : null}
      {isIntake ? (
        <IntakeLotsView canAct={canCreateIntake} />
      ) : (
        <OrdersView canAct={!!access.data?.canFulfilOrders} />
      )}
    </Screen>
  );
}
