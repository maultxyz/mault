import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { BinHeightsProvider } from "@/features/calibration/api/use-bin-heights";
import { BinRoutesProvider } from "@/features/calibration/api/use-bin-routes";
import { FeederConfigProvider } from "@/features/calibration/api/use-feeder-config";
import { ModuleConfigsProvider } from "@/features/calibration/api/use-module-configs";
import { ModuleCountConfigProvider } from "@/features/calibration/api/use-module-count-config";
import { CardFiltersProvider } from "@/features/cards/api/use-card-filters";
import { CollectionsProvider } from "@/features/collections/api/use-collections";
import { CameraProvider } from "@/features/scanner/api/use-camera";
import { ScannedCardsProvider } from "@/features/scanner/api/use-scanned-cards";
import { SerialProvider } from "@/features/scanner/api/use-serial";
import { StationContext, useStations } from "@/features/scanner/api/use-stations";
import { StationPanel } from "@/features/scanner/components/station-panel";
import type { StationState } from "@/lib/interfaces/stations";
import { useMemo } from "react";
import { createPortal } from "react-dom";

// One physical sorter's full state: its own serial link, camera, collection,
// calibration and scan session. Only the active station renders the routed
// app; every live station (connected, or the one being viewed) renders its
// scanner column into the scanner page's panel slot, so background tabs keep
// scanning. The idle standby renders no scanner, so it holds no camera.
export function StationScope({
  station,
  index,
  children,
}: {
  station: StationState;
  index: number;
  children: React.ReactNode;
}) {
  const { activeStationId, panelLayout, getPanelElement, isStationLive } =
    useStations();
  const isActive = station.id === activeStationId;
  const isLive = isStationLive(station.id);
  const value = useMemo(
    () => ({ station, index, isActive, isLive }),
    [station, index, isActive, isLive],
  );

  return (
    <StationContext value={value}>
      <CollectionsProvider>
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
                            {isActive && children}
                            {panelLayout &&
                              isLive &&
                              createPortal(
                                <StationPanel layout={panelLayout} />,
                                getPanelElement(station.id),
                              )}
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
      </CollectionsProvider>
    </StationContext>
  );
}
