import { DeleteDialog } from "@/components/delete-dialog";
import { useBusinessAction } from "@/features/business/api/use-business";
import { BuyFinishDialog } from "@/features/business/components/buy-finish-dialog";
import { BuyStartDialog } from "@/features/business/components/buy-start-dialog";
import { IntakeCancelDialog } from "@/features/business/components/intake-cancel-dialog";
import { IntakeTransferDialog } from "@/features/business/components/intake-transfer-dialog";
import { removeCollectionCards } from "@/features/collections/api/collections";
import type { ScannerBuyDialogsProps } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";

export function ScannerBuyDialogs({ state, onFinished }: ScannerBuyDialogsProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const { dialog, setDialog } = state;
  const closeWhen = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const removeCards = async (collectionGuid: string, scanIds: string[]) => {
    setDialog(null);
    await run(
      () => removeCollectionCards(collectionGuid, scanIds),
      t("intake.remove.done", { count: scanIds.length }),
    );
  };

  return (
    <>
      {dialog?.kind === "finish" && (
        <BuyFinishDialog
          lot={dialog.lot}
          open
          onOpenChange={closeWhen}
          onFinished={() => {
            state.markFinished(dialog.lot.guid);
            onFinished?.();
          }}
        />
      )}
      {dialog?.kind === "cancel" && (
        <IntakeCancelDialog lot={dialog.lot} open onOpenChange={closeWhen} />
      )}
      {dialog?.kind === "transfer" && (
        <IntakeTransferDialog lot={dialog.lot} open onOpenChange={closeWhen} />
      )}
      {dialog?.kind === "remove" && (
        <DeleteDialog
          open
          onOpenChange={closeWhen}
          title={t("intake.remove.title", { count: dialog.scanIds.length })}
          description={t("intake.remove.description", { name: dialog.lot.customerName })}
          confirmLabel={t("intake.remove.button")}
          focusConfirm
          onConfirm={() => void removeCards(dialog.lot.collectionGuid, dialog.scanIds)}
        />
      )}
      <BuyStartDialog
        open={dialog?.kind === "start"}
        onOpenChange={closeWhen}
        defaultCollectionGuid={state.collectionGuid}
        opensScannerAfterStart={false}
      />
    </>
  );
}
