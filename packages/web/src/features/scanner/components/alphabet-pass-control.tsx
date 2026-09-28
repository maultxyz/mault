import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAlphabetPass } from "@/features/bins/api/use-alphabet-pass";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AlphabetPassDialog } from "@/features/bins/components/alphabet-pass-dialog";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AlphabetPassControl() {
  const { t } = useTranslation("scanner");
  const { t: tBins } = useTranslation("bins");
  const { isPresetMutating } = useBinConfigs();
  const { isTimerActive } = useScannedCards();
  const { isActive, pass, passCount, from, to, isLastPass } =
    useAlphabetPass();
  const [pendingPass, setPendingPass] = useState<number | null>(null);

  if (!isActive || passCount === 0) return null;

  const nextPass = isLastPass ? 0 : pass + 1;
  const button = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPresetMutating || isTimerActive || passCount === 1}
      onClick={() => setPendingPass(nextPass)}
    >
      {isLastPass ? (
        <>
          <IconRefresh /> {tBins("alphabetPanel.startOver")}
        </>
      ) : (
        <>
          {tBins("alphabetPanel.next")} <IconArrowRight />
        </>
      )}
    </Button>
  );

  return (
    <div className="rounded-lg border p-2 flex items-center justify-between gap-2 flex-none">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium">
          {t("alphabetPassControl.range", { from, to })}
        </span>
        <span className="text-xs text-foreground/70">
          {tBins("alphabetPanel.passHeading", {
            current: pass + 1,
            total: passCount,
          })}
        </span>
      </div>
      {isTimerActive ? (
        <Tooltip>
          <TooltipTrigger render={<span />}>{button}</TooltipTrigger>
          <TooltipContent>{t("alphabetPassControl.stopFirst")}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <AlphabetPassDialog
        pendingPass={pendingPass}
        onClose={() => setPendingPass(null)}
      />
    </div>
  );
}
