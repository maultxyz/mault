import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { BinStatusMeter } from "@/features/scanner/components/bin-status-meter";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { GameSwitchAlert } from "@/features/scanner/components/game-switch-alert";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import type { StationPanelLayout } from "@/lib/interfaces/stations";

export function StationPanel({ layout }: { layout: StationPanelLayout }) {
  const { unmatchedCards, removeUnmatchedCard } = useScannedCards();

  if (layout === "vertical") {
    return (
      <>
        <div className="flex flex-col gap-2 min-w-0">
          <CardScanner className="flex-1 min-h-0" />
        </div>
        <ScanStats />
        <div className="flex flex-col gap-4 w-52 shrink-0 overflow-y-auto">
          <CollectionSwitcher />
          <PresetSelector readOnly />
          <UnmatchedCardsPanel
            cards={unmatchedCards}
            onRemove={removeUnmatchedCard}
          />
          <BinStatusMeter />
          <GameSwitchAlert />
        </div>
      </>
    );
  }

  return (
    <>
      <CollectionSwitcher />
      <PresetSelector readOnly />
      <CardScanner className="flex-none" />
      <GameSwitchAlert />
      <UnmatchedCardsPanel
        cards={unmatchedCards}
        onRemove={removeUnmatchedCard}
      />
      <BinStatusMeter />
      <ScanStats />
    </>
  );
}
