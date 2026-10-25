import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { ScanRemovalBinSelect } from "@/features/scanner/components/scan-removal-bin-select";
import type { ScanModeSwitchProps } from "@/lib/interfaces/scan-removal";
import { cn } from "@/lib/utils";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScanModeSwitch({ className }: ScanModeSwitchProps) {
  const { t } = useTranslation("scanner");
  const { isRemoveModeEnabled, isSorterConnected, setRemoveModeEnabled } =
    useScanRemoval();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ButtonGroup
        aria-label={t("scanRemoval.modeLabel")}
        className="w-full *:flex-1"
      >
        <Button
          variant={isRemoveModeEnabled ? "outline" : "outline-selected"}
          aria-pressed={!isRemoveModeEnabled}
          onClick={() => setRemoveModeEnabled(false)}
        >
          <IconPlus />
          {t("scanRemoval.addMode")}
        </Button>
        <Button
          variant={isRemoveModeEnabled ? "outline-selected" : "outline"}
          aria-pressed={isRemoveModeEnabled}
          onClick={() => setRemoveModeEnabled(true)}
        >
          <IconTrash />
          {t("scanRemoval.removeMode")}
        </Button>
      </ButtonGroup>
      {isRemoveModeEnabled && isSorterConnected && <ScanRemovalBinSelect />}
    </div>
  );
}
