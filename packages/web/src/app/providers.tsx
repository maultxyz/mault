import { AppLoadingGate } from "@/app/app-loading-gate";
import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { BinRoutesProvider } from "@/features/calibration/api/use-bin-routes";
import { FeederConfigProvider } from "@/features/calibration/api/use-feeder-config";
import { ModuleConfigsProvider } from "@/features/calibration/api/use-module-configs";
import { CardFiltersProvider } from "@/features/cards/api/use-card-filters";
import { CollectionLocksProvider } from "@/features/collections/api/use-collection-locks";
import { CollectionsProvider } from "@/features/collections/api/use-collections";
import { LiveSessionStatusProvider } from "@/features/collections/api/use-live-counts";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { OrgPickerModal } from "@/features/companies/components/org-picker-modal";
import { CameraProvider } from "@/features/scanner/api/use-camera";
import { ScannedCardsProvider } from "@/features/scanner/api/use-scanned-cards";
import { ScannerIslandProvider } from "@/features/scanner/api/use-scanner-island";
import { SerialProvider } from "@/features/scanner/api/use-serial";
import { DocumentTitleUpdater } from "@/features/scanner/components/document-title-updater";
import { AppAlertsProvider } from "@/hooks/alerts/use-app-alerts";
import {
  applyPrimaryColor,
  resetPrimaryColor,
  THEME_COLORS,
} from "@/lib/primary-color";
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
          <CameraProvider>
            <SerialProvider>
              <BinRoutesProvider>
                <BinConfigsProvider>
                  <CollectionLocksProvider>
                    <LiveSessionStatusProvider>
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
                    </LiveSessionStatusProvider>
                  </CollectionLocksProvider>
                </BinConfigsProvider>
              </BinRoutesProvider>
            </SerialProvider>
          </CameraProvider>
        </CollectionsProvider>
      </ScannerIslandProvider>
    </QueryClientProvider>
  );
}
