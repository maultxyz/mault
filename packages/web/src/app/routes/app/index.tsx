import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CardGrid } from "@/features/cards/components/card-grid";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { GameSwitchAlert } from "@/features/scanner/components/game-switch-alert";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useResizablePanel } from "@/hooks/use-resizable-panel";
import { IconCards } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function MobileScanner() {
  const { t } = useTranslation("scanner");
  const { cards, unmatchedCards, removeUnmatchedCard } = useScannedCards();

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div className="p-2 size-full bg-sidebar flex flex-col gap-2">
        <CardScanner className="flex-1 min-h-0" />
        <UnmatchedCardsPanel
          cards={unmatchedCards}
          onRemove={removeUnmatchedCard}
        />
        <GameSwitchAlert />
      </div>
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium shadow-lg"
          >
            <IconCards size={16} />
            {t("appScanner.cardCount", { count: cards.length })}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(80vh-2rem)]">
            <div className="flex flex-col gap-2">
              <CollectionSwitcher />
              <PresetSelector readOnly />
            </div>
            <ScanStats />
            <div className="@container">
              <CardGrid />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const { unmatchedCards, removeUnmatchedCard } = useScannedCards();
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const isVertical = orgSettings?.scannerLayout === "vertical";

  const {
    size: scannerHeight,
    isDragging: isResizingHeight,
    onPointerDown: onHeightPointerDown,
  } = useResizablePanel({
    axis: "height",
    defaultSize: 384,
    min: 220,
    max: 640,
    storageKey: "scannerPanelHeight",
  });

  const {
    size: scannerWidth,
    isDragging: isResizingWidth,
    onPointerDown: onWidthPointerDown,
  } = useResizablePanel({
    axis: "width",
    defaultSize: 340,
    min: 260,
    max: 640,
    storageKey: "scannerPanelWidth",
  });

  if (isMobile) {
    return <MobileScanner />;
  }

  if (isVertical) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <section
          style={{ height: scannerHeight }}
          className="flex items-stretch gap-2 p-2 bg-sidebar/70 shrink-0"
        >
          <div className="flex flex-col gap-2 min-w-0">
            <CardScanner className="flex-1 min-h-0" />
          </div>
          <ScanStats />
          <div className="flex flex-col gap-2 w-52 shrink-0 overflow-y-auto">
            <CollectionSwitcher />
            <PresetSelector readOnly />
            <ScannerDebug />
            <UnmatchedCardsPanel
              cards={unmatchedCards}
              onRemove={removeUnmatchedCard}
            />
            <GameSwitchAlert />
          </div>
        </section>
        <ResizeHandle
          orientation="horizontal"
          isDragging={isResizingHeight}
          onPointerDown={onHeightPointerDown}
        />
        <section className="flex-1 min-h-0 overflow-y-auto @container flex flex-col">
          <CardGrid />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <section
        style={{ width: scannerWidth }}
        className="shrink-0 overflow-hidden flex flex-col h-full p-2 gap-2 bg-sidebar/70"
      >
        <CollectionSwitcher />
        <PresetSelector readOnly />
        <CardScanner className="flex-none" />
        <GameSwitchAlert />
        <ScannerDebug />
        <UnmatchedCardsPanel
          cards={unmatchedCards}
          onRemove={removeUnmatchedCard}
        />
        <ScanStats />
      </section>
      <ResizeHandle
        orientation="vertical"
        isDragging={isResizingWidth}
        onPointerDown={onWidthPointerDown}
      />
      <section className="flex-1 min-w-0 overflow-y-auto h-full @container flex flex-col">
        <CardGrid />
      </section>
    </div>
  );
}
