import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { computeBinCount } from "@magic-vault/shared";
import { IconPackage, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface BinRoutingControlsProps {
  activeBin: number | null;
  isReady: boolean;
  isSampleRunning: boolean;
  onTestBin: (bin: number) => void;
  onSampleRun: () => void;
}

export function BinRoutingControls({
  activeBin,
  isReady,
  isSampleRunning,
  onTestBin,
  onSampleRun,
}: BinRoutingControlsProps) {
  const { t } = useTranslation("calibration");
  const moduleCount = useModuleCount();
  const bins = Array.from({ length: computeBinCount(moduleCount) }, (_, i) => i + 1);
  const busy = activeBin !== null || isSampleRunning;

  return (
    <div className="flex flex-col gap-2" data-tour="bin-routing-controls">
      <Label>{t("binRoutingControls.label")}</Label>
      <div className="flex items-center gap-2">
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
              activeBin === bin && !isSampleRunning ? "outline-selected" : "outline"
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
    </div>
  );
}
