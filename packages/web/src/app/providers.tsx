import { AppLoadingGate } from "@/app/app-loading-gate";
import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { BinHeightsProvider } from "@/features/calibration/api/use-bin-heights";
import { BinRoutesProvider } from "@/features/calibration/api/use-bin-routes";
import { FeederConfigProvider } from "@/features/calibration/api/use-feeder-config";
import { ModuleConfigsProvider } from "@/features/calibration/api/use-module-configs";
import { ModuleCountConfigProvider } from "@/features/calibration/api/use-module-count-config";
import { CardFiltersProvider } from "@/features/cards/api/use-card-filters";
import { CollectionsProvider } from "@/features/collections/api/use-collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { OrgPickerModal } from "@/features/companies/components/org-picker-modal";
import { OnboardingProvider } from "@/features/onboarding/components/onboarding-provider";
import { CameraProvider } from "@/features/scanner/api/use-camera";
import { ScannedCardsProvider } from "@/features/scanner/api/use-scanned-cards";
import { ScannerIslandProvider } from "@/features/scanner/api/use-scanner-island";
import { SerialProvider } from "@/features/scanner/api/use-serial";
import { DocumentTitleUpdater } from "@/features/scanner/components/document-title-updater";
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

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OrgThemeApplier />
      <ScannerIslandProvider>
        <CollectionsProvider>
          <OnboardingProvider>
            <AppStreamProvider>
              <CameraProvider>
                <SerialProvider>
                  <BinRoutesProvider>
                    <BinHeightsProvider>
                      <ModuleCountConfigProvider>
                        <BinConfigsProvider>
                          <ModuleConfigsProvider>
                            <FeederConfigProvider>
                              <ScannedCardsProvider>
                                <CardFiltersProvider>
                                  <AppAlertsProvider>
                                    <AppLoadingGate>{children}</AppLoadingGate>
                                  </AppAlertsProvider>
                                  <OrgPickerModal />
                                  <DocumentTitleUpdater />
                                </CardFiltersProvider>
                              </ScannedCardsProvider>
                            </FeederConfigProvider>
                          </ModuleConfigsProvider>
                        </BinConfigsProvider>
                      </ModuleCountConfigProvider>
                    </BinHeightsProvider>
                  </BinRoutesProvider>
                </SerialProvider>
              </CameraProvider>
            </AppStreamProvider>
          </OnboardingProvider>
        </CollectionsProvider>
      </ScannerIslandProvider>
    </QueryClientProvider>
  );
}
