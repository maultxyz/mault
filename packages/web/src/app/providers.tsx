import { AppLoadingGate, InitialLoadProvider } from "@/app/app-loading-gate";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { OrgPickerModal } from "@/features/companies/components/org-picker-modal";
import { OnboardingProvider } from "@/features/onboarding/components/onboarding-provider";
import {
  StationsProvider,
  useStations,
} from "@/features/scanner/api/use-stations";
import { DocumentTitleUpdater } from "@/features/scanner/components/document-title-updater";
import { StationScope } from "@/features/scanner/components/station-scope";
import { AppAlertsProvider } from "@/hooks/alerts/use-app-alerts";
import { AppStreamProvider } from "@/lib/app-stream";
import { THEME_COLORS } from "@/lib/constants/colors";
import { applyPrimaryColor, resetPrimaryColor } from "@/lib/primary-color";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";

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
    const color = data?.primaryColor
      ? THEME_COLORS.find((c) => c.name === data.primaryColor)
      : null;
    if (color) {
      applyPrimaryColor(color);
    } else {
      resetPrimaryColor();
    }
  }, [data?.primaryColor]);

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

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OrgThemeApplier />
      <AppStreamProvider>
        <StationsProvider>
          <InitialLoadProvider>
            <StationScopes>
              <OnboardingProvider>
                <AppAlertsProvider>
                  <AppLoadingGate>{children}</AppLoadingGate>
                </AppAlertsProvider>
                <OrgPickerModal />
                <DocumentTitleUpdater />
              </OnboardingProvider>
            </StationScopes>
          </InitialLoadProvider>
        </StationsProvider>
      </AppStreamProvider>
    </QueryClientProvider>
  );
}
