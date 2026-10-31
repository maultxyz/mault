import { AppLoadingGate, InitialLoadProvider } from "@/app/app-loading-gate";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { OrgPickerModal } from "@/features/companies/components/org-picker-modal";
import { MemberSeatLockScreen } from "@/components/member-seat-lock-screen";
import { OnboardingProvider } from "@/features/onboarding/components/onboarding-provider";
import { SorterSelectionProvider } from "@/features/scanner/api/use-sorter-selection";
import {
  StationsProvider,
  useStations,
} from "@/features/scanner/api/use-stations";
import { DeployPauseProvider } from "@/features/scanner/api/use-deploy-pause";
import { PendingScanSavesProvider } from "@/features/scanner/api/use-pending-scan-saves";
import { DocumentTitleUpdater } from "@/features/scanner/components/document-title-updater";
import { StationScope } from "@/features/scanner/components/station-scope";
import { AppAlertsProvider } from "@/hooks/alerts/use-app-alerts";
import { OrgPriceSourceProvider } from "@/hooks/use-price-source";
import { AppStreamProvider } from "@/lib/app-stream";
import { applyPrimaryColorName } from "@/lib/primary-color";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { useSerialAutoConnect } from "@/features/scanner/api/use-serial-auto-connect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 1,
    },
  },
});

function OrgThemeApplier() {
  const { activeOrg } = useOrg();
  const { data } = useQuery(orgSettingsQueryOptions(activeOrg?.id));

  useEffect(() => {
    applyPrimaryColorName(data?.primaryColor ?? null);
  }, [data?.primaryColor]);

  return null;
}

function SerialAutoConnect() {
  useSerialAutoConnect();
  return null;
}

function StationScopes({ children }: { children: React.ReactNode }) {
  const { stations } = useStations();
  return stations.map((station, index) => (
    <StationScope key={station.id} station={station} index={index}>
      {children}
    </StationScope>
  ));
}

export function BaseProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OrgThemeApplier />
      <OrgPriceSourceProvider>{children}</OrgPriceSourceProvider>
    </QueryClientProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BaseProviders>
      <AppStreamProvider>
        <StationsProvider>
          <InitialLoadProvider>
            <PendingScanSavesProvider>
              <DeployPauseProvider>
                <SorterSelectionProvider>
                  <StationScopes>
                    <OnboardingProvider>
                      <AppAlertsProvider>
                        <AppLoadingGate>{children}</AppLoadingGate>
                      </AppAlertsProvider>
                      <OrgPickerModal />
                      <MemberSeatLockScreen />
                      <DocumentTitleUpdater />
                    </OnboardingProvider>
                  </StationScopes>
                </SorterSelectionProvider>
              </DeployPauseProvider>
            </PendingScanSavesProvider>
            <SerialAutoConnect />
          </InitialLoadProvider>
        </StationsProvider>
      </AppStreamProvider>
    </BaseProviders>
  );
}
