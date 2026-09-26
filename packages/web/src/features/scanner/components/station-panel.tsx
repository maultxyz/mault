import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { BinStatusMeter } from "@/features/scanner/components/bin-status-meter";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import type { StationPanelLayout } from "@/lib/interfaces/stations";

export function StationPanel({ layout }: { layout: StationPanelLayout }) {
  const { unmatchedCards, removeUnmatchedCard } = useScannedCards();

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
        </div>
      </>
    );
  }

  return (
    <>
      <CollectionSwitcher />
      <PresetSelector readOnly />
      <CardScanner className="flex-none" />
      <UnmatchedCardsPanel
        cards={unmatchedCards}
        onRemove={removeUnmatchedCard}
      />
      <BinStatusMeter />
      <ScanStats />
    </>
  );
}
