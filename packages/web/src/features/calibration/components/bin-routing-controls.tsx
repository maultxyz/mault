import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useResetToNeutral } from "@/features/scanner/api/use-reset-to-neutral";
import { computeBinCount } from "@magic-vault/shared";
import {
  IconLoader2,
  IconPackage,
  IconPlayerPlay,
  IconRotate2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { BinRoutingControlsProps } from "@/lib/interfaces/calibration";

export function BinRoutingControls({
  activeBin,
  isReady,
  isSampleRunning,
  onTestBin,
  onSampleRun,
}: BinRoutingControlsProps) {
  const { t } = useTranslation("calibration");
  const moduleCount = useModuleCount();
  const { handleResetToNeutral, isResetting } = useResetToNeutral();
  const bins = Array.from(
    { length: computeBinCount(moduleCount) },
    (_, i) => i + 1,
  );
  const busy = activeBin !== null || isSampleRunning || isResetting;

  return (
    <SettingsSection
      dataTour="bin-routing-controls"
      heading={t("binRoutingControls.label")}
      action={
        <Button
          variant="outline"
          disabled={!isReady || busy}
          onClick={handleResetToNeutral}
        >
          {isResetting ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconRotate2 />
          )}
          {t("binRoutingControls.resetToNeutral")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isSampleRunning ? "outline-selected" : "outline"}
          disabled={!isReady || busy}
          onClick={onSampleRun}
        >
          <IconPlayerPlay />
          {isSampleRunning
            ? activeBin !== null
              ? t("binRoutingControls.binActive", { bin: activeBin })
              : t("binRoutingControls.running")
            : t("binRoutingControls.sampleRun")}
        </Button>
        <div className="bg-border w-px self-stretch" />
        {bins.map((bin) => (
          <Button
            key={bin}
            variant={
              activeBin === bin && !isSampleRunning
                ? "outline-selected"
                : "outline"
            }
            disabled={!isReady || busy}
            onClick={() => onTestBin(bin)}
          >
            <IconPackage />
            {t("binLabel", {
              bin: activeBin === bin && !isSampleRunning ? "…" : bin,
            })}
          </Button>
        ))}
      </div>
    </SettingsSection>
  );
}
