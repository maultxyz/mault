import { AlphabetPassControl } from "@/features/scanner/components/alphabet-pass-control";
import { AutoAssignControl } from "@/features/scanner/components/auto-assign-control";
import { PresetStageControl } from "@/features/scanner/components/preset-stage-control";
import { BinStatusMeter } from "@/features/scanner/components/bin-status-meter";
import { LazyCardScanner } from "@/features/scanner/components/lazy-card-scanner";
import { ActiveCollectionUnmatchedCardsPanel } from "@/features/scanner/components/active-collection-unmatched-cards-panel";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import type { StationPanelLayout } from "@/lib/interfaces/stations";
import { useState } from "react";

export function StationPanel({ layout }: { layout: StationPanelLayout }) {
  const [controlsContainer, setControlsContainer] =
    useState<HTMLDivElement | null>(null);

  if (layout === "vertical") {
    return (
      <>
        <LazyCardScanner className="h-full shrink-0" controlsPosition="side" />
        <div className="flex flex-col gap-4 md:gap-2 shrink-0 overflow-y-auto">
          <ActiveCollectionUnmatchedCardsPanel />
          <BinStatusMeter />
          <AutoAssignControl />
          <AlphabetPassControl />
          <PresetStageControl />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <ScanStats />
        </div>
      </>
    );
  }

  return (
    <>
      <LazyCardScanner
        className="-mx-2 -mt-2 flex-none"
        controlsContainer={controlsContainer}
        viewerTouchesPanelEdges
      />
      <div
        ref={setControlsContainer}
        className="sticky top-0 z-40 -mx-2 -my-1 flex-none bg-sidebar/95 px-2 py-1 backdrop-blur-sm empty:hidden"
      />
      <ActiveCollectionUnmatchedCardsPanel />
      <BinStatusMeter />
      <AutoAssignControl />
      <AlphabetPassControl />
      <PresetStageControl />
      <ScanStats scrollable={false} />
    </>
  );
}
