import { useNewBoardFlash } from "@/features/scanner/api/use-new-board-flash";
import { FirmwareFlashDialog } from "@/features/scanner/components/firmware-flash-dialog";
import { useTranslation } from "react-i18next";

export function NewBoardFlashDialog({
  open,
  onOpenChange,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect?: () => void;
}) {
  const { t } = useTranslation("scanner");
  const { isFlashing, flashProgress, flashLog, flashNewBoard } =
    useNewBoardFlash();

  return (
    <FirmwareFlashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("serial.flash.newBoard.dialogTitle")}
      description={t("serial.flash.newBoard.dialogDescription")}
      hint={
        <ul className="flex flex-col gap-1.5 text-sm text-foreground/70 list-disc pl-4">
          <li>{t("serial.flash.newBoard.hintPort")}</li>
          <li>{t("serial.flash.newBoard.hintBootMode")}</li>
        </ul>
      }
      startLabel={t("serial.flash.newBoard.startButton")}
      successMessage={t("serial.flash.newBoard.success")}
      successAction={
        onConnect
          ? { label: t("serial.flash.newBoard.connectButton"), onClick: onConnect }
          : undefined
      }
      isFlashing={isFlashing}
      flashProgress={flashProgress}
      flashLog={flashLog}
      onStart={flashNewBoard}
    />
  );
}
