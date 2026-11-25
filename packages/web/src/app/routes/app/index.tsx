import { ScanningBlockedWhileImpersonating } from "@/components/scanning-blocked-while-impersonating";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { useReviewQueueSession } from "@/features/cards/api/use-review-queue";
import { ReviewQueuePanel } from "@/features/cards/components/collection-review-queue-panel";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { ScannerMainContent } from "@/features/scanner/components/scanner-main-content";
import { StationPanels } from "@/features/scanner/components/station-panels";
import { ActiveCollectionUnmatchedCardsPanel } from "@/features/scanner/components/active-collection-unmatched-cards-panel";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_SCAN_PATH } from "@/lib/constants/nav";
import type { StationPanelLayout } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import { useImpersonation } from "@/hooks/use-impersonation";
import { useResizablePanel } from "@/hooks/use-resizable-panel";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

function ScannerPanels({
  layout,
  size,
}: {
  layout: StationPanelLayout;
  size: number;
}) {
  const { isImpersonating } = useImpersonation();
  const reviewQueueSession = useReviewQueueSession();
  const overlay = reviewQueueSession && (
    <ReviewQueuePanel session={reviewQueueSession} />
  );
  if (!isImpersonating) {
    return <StationPanels layout={layout} size={size} overlay={overlay} />;
  }
  return (
    <div
      className={cn(
        "shrink-0 p-2 bg-sidebar/70 flex flex-col gap-2 overflow-y-auto",
        layout === "horizontal" ? "h-full" : "w-full",
      )}
      style={layout === "horizontal" ? { width: size } : { height: size }}
    >
      {overlay || (
        <>
          <div className="flex-1 min-h-0">
            <ScanningBlockedWhileImpersonating />
          </div>
          <ActiveCollectionUnmatchedCardsPanel />
        </>
      )}
    </div>
  );
}

export default function App() {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const isVertical = orgSettings?.scannerLayout === "vertical";

  const {
    size: scannerHeight,
    isDragging: isResizingHeight,
    onPointerDown: onHeightPointerDown,
    onKeyDown: onHeightKeyDown,
    valueMin: scannerHeightMin,
    valueMax: scannerHeightMax,
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
    onKeyDown: onWidthKeyDown,
    valueMin: scannerWidthMin,
    valueMax: scannerWidthMax,
  } = useResizablePanel({
    axis: "width",
    defaultSize: 340,
    min: 260,
    max: 640,
    storageKey: "scannerPanelWidth",
  });

  if (isMobile) {
    return <Navigate to={MOBILE_SCAN_PATH} replace />;
  }

  if (isVertical) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <h1 className="sr-only">{t("nav.scanner")}</h1>
        <ScannerPanels layout="vertical" size={scannerHeight} />
        <ResizeHandle
          orientation="horizontal"
          isDragging={isResizingHeight}
          onPointerDown={onHeightPointerDown}
          onKeyDown={onHeightKeyDown}
          valueNow={scannerHeight}
          valueMin={scannerHeightMin}
          valueMax={scannerHeightMax}
        />
        <section className="flex-1 min-h-0 overflow-y-auto @container flex flex-col">
          <ScannerMainContent />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <h1 className="sr-only">{t("nav.scanner")}</h1>
      <ScannerPanels layout="horizontal" size={scannerWidth} />
      <ResizeHandle
        orientation="vertical"
        isDragging={isResizingWidth}
        onPointerDown={onWidthPointerDown}
        onKeyDown={onWidthKeyDown}
        valueNow={scannerWidth}
        valueMin={scannerWidthMin}
        valueMax={scannerWidthMax}
      />
      <section className="flex-1 min-w-0 overflow-y-auto h-full @container flex flex-col">
        <ScannerMainContent />
      </section>
    </div>
  );
}
