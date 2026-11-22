import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { BusinessOverviewView } from "@/features/business/components/business-overview-view";
import { IntakeLotsView } from "@/features/business/components/intake-lots-view";
import { OrdersView } from "@/features/business/components/orders-view";
import { ReservationsView } from "@/features/business/components/reservations-view";
import { useActiveOrgId } from "@/hooks/use-org";
import {
  BUSINESS_INTAKE_VIEW,
  BUSINESS_OVERVIEW_VIEW,
  BUSINESS_QUERY_KEY,
  BUSINESS_PICKS_VIEW,
  BUSINESS_RESERVATIONS_VIEW,
  BUSINESS_VIEWS,
} from "@/lib/constants/business";
import type { BusinessHubProps, BusinessView } from "@/lib/interfaces/business";

export function BusinessHub({ onBack }: BusinessHubProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const view: BusinessView =
    BUSINESS_VIEWS.find((candidate) => candidate === viewParam) ?? BUSINESS_OVERVIEW_VIEW;
  const access = useQuery(businessAccessQueryOptions(orgId));
  const isLocked = !!access.data?.isLocked;
  const canCreateIntake = !!access.data && !isLocked;
  const canCreatePick = !!access.data?.canFulfilOrders && !isLocked;
  const isIntake = view === BUSINESS_INTAKE_VIEW;
  const isReservations = view === BUSINESS_RESERVATIONS_VIEW;
  const isOverview = view === BUSINESS_OVERVIEW_VIEW;

  return (
    <Screen
      onRefresh={() => queryClient.invalidateQueries({ queryKey: BUSINESS_QUERY_KEY })}
      header={
        <PageHeader
          title={isOverview ? t("business.title") : t(`business.views.${view}`)}
          subtitle={isOverview ? t("business.subtitle") : undefined}
          onBack={onBack}
          actions={
            !isReservations && !isOverview && (isIntake ? canCreateIntake : canCreatePick) ? (
              <IconButton
                icon="plus"
                accessibilityLabel={isIntake ? t("business.intake.new") : t("business.picks.new")}
                onPress={() => router.push(isIntake ? "/business/intake-new" : "/business/pick-new")}
              />
            ) : null
          }
        />
      }
    >
      {isLocked ? <Callout tone="info" title={t("business.locked")} description={t("business.lockedDescription")} /> : null}
      {isOverview ? (
        <BusinessOverviewView
          onOpenView={(nextView) => router.push({ pathname: "/business", params: { view: nextView } })}
        />
      ) : isIntake ? (
        <IntakeLotsView canAct={canCreateIntake} />
      ) : isReservations ? (
        <ReservationsView canAct={canCreatePick} />
      ) : (
        <OrdersView canAct={!!access.data?.canFulfilOrders} />
      )}
    </Screen>
  );
}
