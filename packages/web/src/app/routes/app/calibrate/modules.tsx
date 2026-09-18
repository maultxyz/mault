import { Label } from "@/components/ui/label";
import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { BinRoutingAssignment } from "@/features/calibration/components/bin-routing-assignment";
import { BinRoutingControls } from "@/features/calibration/components/bin-routing-controls";
import { ChannelLayoutToggle } from "@/features/calibration/components/channel-layout-toggle";
import { IrSensorPanel } from "@/features/calibration/components/ir-sensor-panel";
import { ModuleCountStepper } from "@/features/calibration/components/module-count-stepper";
import { useTranslation } from "react-i18next";

export default function CalibrateModulesPage() {
  const { t } = useTranslation("calibration");
  const {
    modules,
    irStates,
    hopperHasCards,
    isConnected,
    irMonitoring,
    handleReadIR,
    handleToggleIrMonitor,
    activeBin,
    isSampleRunning,
    handleTestBin,
    handleSampleRun,
  } = useCalibrationOutletContext();

  return (
    <>
      <div className="flex flex-col gap-1.5" data-tour="channel-layout">
        <Label>{t("channelLayoutToggle.label")}</Label>
        <ChannelLayoutToggle />
      </div>
      <IrSensorPanel
        modules={modules}
        irStates={irStates}
        hopperHasCards={hopperHasCards}
        isConnected={isConnected}
        isMonitoring={irMonitoring}
        onRead={handleReadIR}
        onToggleMonitor={handleToggleIrMonitor}
      />
      <BinRoutingControls
        activeBin={activeBin}
        isConnected={isConnected}
        isSampleRunning={isSampleRunning}
        onTestBin={handleTestBin}
        onSampleRun={handleSampleRun}
      />
      <div className="flex flex-col gap-1.5" data-tour="module-count">
        <Label>{t("moduleCountStepper.label")}</Label>
        <ModuleCountStepper />
      </div>
      <BinRoutingAssignment />
    </>
  );
}
