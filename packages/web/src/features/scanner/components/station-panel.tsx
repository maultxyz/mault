import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { AlphabetPassControl } from "@/features/scanner/components/alphabet-pass-control";
import { BinStatusMeter } from "@/features/scanner/components/bin-status-meter";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import type { StationPanelLayout } from "@/lib/interfaces/stations";
import { useElementHeight } from "@/hooks/use-element-height";
import { useState } from "react";

export function StationPanel({ layout }: { layout: StationPanelLayout }) {
  const { unmatchedCards, removeUnmatchedCard } = useScannedCards();
  const [controlsContainer, setControlsContainer] =
    useState<HTMLDivElement | null>(null);
  const [stickyHeader, setStickyHeader] = useState<HTMLDivElement | null>(
    null,
  );
  const stickyHeaderHeight = useElementHeight(stickyHeader);

  if (layout === "vertical") {
    return (
      <>
        <CardScanner className="h-full shrink-0" controlsPosition="side" />
        <div className="flex flex-col flex-1 min-w-0">
          <ScanStats />
        </div>
        <div className="flex flex-col gap-4 w-60 shrink-0 overflow-y-auto">
          <CollectionSwitcher />
          <PresetSelector readOnly />
          <UnmatchedCardsPanel
            cards={unmatchedCards}
            onRemove={removeUnmatchedCard}
          />
          <BinStatusMeter />
          <AlphabetPassControl />
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
      <CardScanner className="flex-none" controlsContainer={controlsContainer} />
      <div
        ref={setControlsContainer}
        style={{ top: stickyHeaderHeight }}
        className="sticky z-40 -mx-2 -my-1 flex-none bg-sidebar/95 px-2 py-1 backdrop-blur-sm empty:hidden"
      />
      <UnmatchedCardsPanel
        cards={unmatchedCards}
        onRemove={removeUnmatchedCard}
      />
      <BinStatusMeter />
      <AlphabetPassControl />
      <ScanStats scrollable={false} />
    </>
  );
}
