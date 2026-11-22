import { useScannerBuy } from "@/features/business/api/use-scanner-buy";
import { ScannerBuyDialogs } from "@/features/business/components/scanner-buy-dialogs";
import { ScannerBuyFinishedSummary } from "@/features/business/components/scanner-buy-finished-summary";
import { ScannerBuyOverview } from "@/features/business/components/scanner-buy-overview";
import { ScannerBuyStartBar } from "@/features/business/components/scanner-buy-start-bar";
import { ScannerBuyTour } from "@/features/business/components/scanner-buy-tour";
import { useCollections } from "@/features/collections/api/use-collections";
import { useTranslation } from "react-i18next";

export function ScannerBuyPanel() {
  const { t } = useTranslation("business");
  const { activeCollection } = useCollections();
  const state = useScannerBuy(activeCollection?.guid, true);
  const hasContent = !!state.openBuy || !!state.finishedBuyGuid;

  return (
    <>
      {!hasContent && state.canStartBuy && (
        <ScannerBuyStartBar onStart={() => state.setDialog({ kind: "start" })} />
      )}
      {hasContent && (
        <section
          aria-label={t("scannerBuy.panelLabel")}
          data-tour="scanner-buy-panel"
          className="mx-2 mt-2 shrink-0 rounded-card bg-card p-4 animate-in fade-in-0 motion-reduce:animate-none md:p-2.5"
        >
          {state.openBuy ? (
            <ScannerBuyOverview
              state={state}
              editsOffers
              onOpenDialog={state.setDialog}
              headerAction={<ScannerBuyTour />}
            />
          ) : (
            state.finishedBuyGuid && (
              <ScannerBuyFinishedSummary
                guid={state.finishedBuyGuid}
                onOpenDialog={state.setDialog}
                onDismiss={state.dismissFinished}
              />
            )
          )}
        </section>
      )}
      <ScannerBuyDialogs state={state} />
    </>
  );
}
