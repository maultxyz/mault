import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { AlphabetPassControl } from "@/features/scanner/components/alphabet-pass-control";
import { AutoAssignControl } from "@/features/scanner/components/auto-assign-control";
import { PresetStageControl } from "@/features/scanner/components/preset-stage-control";
import { BinStatusMeter } from "@/features/scanner/components/bin-status-meter";
import { LazyCardScanner } from "@/features/scanner/components/lazy-card-scanner";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import type { StationPanelLayout } from "@/lib/interfaces/stations";
import { useState } from "react";

export function StationPanel({ layout }: { layout: StationPanelLayout }) {
  const {
    unmatchedCards,
    unmatchedCount,
    removeUnmatchedCard,
    removeAllUnmatchedCards,
  } = useScannedCards();
  const { activeCollection } = useCollections();
  const unmatchedPanel = (
    <UnmatchedCardsPanel
      canIdentify
      cards={unmatchedCards}
      total={unmatchedCount}
      collectionGuid={activeCollection?.guid}
      onRemove={removeUnmatchedCard}
      onRemoveAll={removeAllUnmatchedCards}
    />
  );
  const [controlsContainer, setControlsContainer] =
    useState<HTMLDivElement | null>(null);

  if (layout === "vertical") {
    return (
      <>
        <LazyCardScanner className="h-full shrink-0" controlsPosition="side" />
        <div className="flex flex-col gap-4 shrink-0 overflow-y-auto">
          {unmatchedPanel}
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
      {unmatchedPanel}
      <BinStatusMeter />
      <AutoAssignControl />
      <AlphabetPassControl />
      <PresetStageControl />
      <ScanStats scrollable={false} />
    </>
  );
}
