import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { useScannerBuy } from "@/features/business/api/use-scanner-buy";
import { ScannerBuyDialogs } from "@/features/business/components/scanner-buy-dialogs";
import { ScannerBuyFinishedSummary } from "@/features/business/components/scanner-buy-finished-summary";
import { ScannerBuyOverview } from "@/features/business/components/scanner-buy-overview";
import type {
  MobileScannerBuyProps,
  ScannerBuyDialog,
} from "@/lib/interfaces/business";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileScannerBuy({ collectionGuid, renderTrigger }: MobileScannerBuyProps) {
  const { t } = useTranslation("business");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const state = useScannerBuy(collectionGuid, isSheetOpen);
  const { access } = useBusinessAccess();
  const { openBuy, lot } = state;

  const openDialogFromSheet = (dialog: ScannerBuyDialog) => {
    setIsSheetOpen(false);
    state.setDialog(dialog);
  };

  return (
    <>
      {renderTrigger({
        openBuy,
        canStartBuy: state.canStartBuy,
        canFinish: !!lot && lot.cardCount > 0 && (access?.canAcceptIntake ?? false),
        openSheet: () => setIsSheetOpen(true),
        requestFinish: () => {
          if (lot) state.setDialog({ kind: "finish", lot });
        },
        requestStart: () => state.setDialog({ kind: "start" }),
      })}
      <Drawer open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <DrawerTitle className="sr-only">{t("scannerBuy.panelLabel")}</DrawerTitle>
            {openBuy ? (
              <ScannerBuyOverview
                state={state}
                editsOffers={false}
                onOpenDialog={openDialogFromSheet}
                headingLevel="h3"
              />
            ) : state.finishedBuyGuid ? (
              <ScannerBuyFinishedSummary
                guid={state.finishedBuyGuid}
                onOpenDialog={openDialogFromSheet}
                onDismiss={() => {
                  setIsSheetOpen(false);
                  state.dismissFinished();
                }}
              />
            ) : (
              <p className="text-sm text-foreground/70">{t("scannerBuy.noOpenBuy")}</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <ScannerBuyDialogs state={state} onFinished={() => setIsSheetOpen(true)} />
    </>
  );
}
