import { PresetSelector } from "@/features/bins/components/preset-selector";
import { useCollections } from "@/features/collections/api/use-collections";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { AlphabetPassControl } from "@/features/scanner/components/alphabet-pass-control";
import { BinStatusMeter } from "@/features/scanner/components/bin-status-meter";
import { LazyCardScanner } from "@/features/scanner/components/lazy-card-scanner";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { useElementHeight } from "@/hooks/use-element-height";
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
  const [stickyHeader, setStickyHeader] = useState<HTMLDivElement | null>(null);
  const stickyHeaderHeight = useElementHeight(stickyHeader);

  if (layout === "vertical") {
    return (
      <>
        <LazyCardScanner className="h-full shrink-0" controlsPosition="side" />
        <div className="flex flex-col gap-4 shrink-0 overflow-y-auto">
          <CollectionSwitcher />
          <PresetSelector readOnly />
          {unmatchedPanel}
          <BinStatusMeter />
          <AlphabetPassControl />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <ScanStats />
        </div>
      </>
    );
  }

  return (
    <>
      <div
        ref={setStickyHeader}
        className="sticky top-0 z-40 -mx-2 flex flex-none flex-col gap-2 bg-sidebar/95 p-2 backdrop-blur-sm"
      >
        <CollectionSwitcher />
        <PresetSelector readOnly />
      </div>
      <LazyCardScanner
        className="flex-none"
        controlsContainer={controlsContainer}
      />
      <div
        ref={setControlsContainer}
        style={{ top: stickyHeaderHeight }}
        className="sticky z-40 -mx-2 -my-1 flex-none bg-sidebar/95 px-2 py-1 backdrop-blur-sm empty:hidden"
      />
      {unmatchedPanel}
      <BinStatusMeter />
      <AlphabetPassControl />
      <ScanStats scrollable={false} />
    </>
  );
}
