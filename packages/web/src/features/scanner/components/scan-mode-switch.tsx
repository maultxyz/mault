import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import type { ScanModeSwitchProps } from "@/lib/interfaces/scan-removal";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScanModeSwitch({ className }: ScanModeSwitchProps) {
  const { t } = useTranslation("scanner");
  const { isRemoveModeEnabled, setRemoveModeEnabled } = useScanRemoval();

  return (
    <ButtonGroup aria-label={t("scanRemoval.modeLabel")} className={className}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={isRemoveModeEnabled ? "outline" : "outline-selected"}
              size="icon"
              aria-label={t("scanRemoval.addMode")}
              aria-pressed={!isRemoveModeEnabled}
              onClick={() => setRemoveModeEnabled(false)}
            >
              <IconPlus />
            </Button>
          }
        />
        <TooltipContent>{t("scanRemoval.addMode")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={isRemoveModeEnabled ? "outline-destructive" : "outline"}
              size="icon"
              aria-label={t("scanRemoval.removeMode")}
              aria-pressed={isRemoveModeEnabled}
              onClick={() => setRemoveModeEnabled(true)}
            >
              <IconTrash />
            </Button>
          }
        />
        <TooltipContent>{t("scanRemoval.removeMode")}</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  );
}
