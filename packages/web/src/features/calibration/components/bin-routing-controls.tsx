import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { computeBinCount } from "@magic-vault/shared";
import { IconPackage, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface BinRoutingControlsProps {
  activeBin: number | null;
  isConnected: boolean;
  isSampleRunning: boolean;
  onTestBin: (bin: number) => void;
  onFeed: () => void;
  onSampleRun: () => void;
}

export function BinRoutingControls({
  activeBin,
  isConnected,
  isSampleRunning,
  onTestBin,
  onFeed,
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
        <Button variant="outline" disabled={!isConnected || busy} onClick={onFeed}>
          {t("binRoutingControls.feed")}
        </Button>
        <Button
          variant={isSampleRunning ? "default" : "outline"}
          disabled={!isConnected || busy}
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
            variant={activeBin === bin && !isSampleRunning ? "default" : "outline"}
            disabled={!isConnected || busy}
            onClick={() => onTestBin(bin)}
          >
            <IconPackage />
            {t("binRoutingControls.binButton", {
              bin: activeBin === bin && !isSampleRunning ? "…" : bin,
            })}
          </Button>
        ))}
      </div>
    </div>
  );
}
