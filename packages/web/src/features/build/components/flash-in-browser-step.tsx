import { Button } from "@/components/ui/button";
import { useNewBoardFlash } from "@/features/scanner/api/use-new-board-flash";
import { NewBoardFlashDialog } from "@/features/scanner/components/new-board-flash-dialog";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FlashInBrowserStep() {
  const { t } = useTranslation("build");
  const { isSupported } = useNewBoardFlash();
  const [open, setOpen] = useState(false);

  return (
    <>
      {t("assembly.phases.firmware.steps.flashInBrowser.text")}{" "}
      {isSupported ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          {t("assembly.phases.firmware.steps.flashInBrowser.button")}
        </Button>
      ) : (
        t("assembly.phases.firmware.steps.flashInBrowser.unsupported")
      )}
      <NewBoardFlashDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
