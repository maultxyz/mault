import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { BinRoutingControls } from "@/features/calibration/components/bin-routing-controls";
import { IrSensorPanel } from "@/features/calibration/components/ir-sensor-panel";

export default function CalibrateTestPage() {
  const {
    modules,
    irStates,
    hopperHasCards,
    isReady,
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
      <IrSensorPanel
        modules={modules}
        irStates={irStates}
        hopperHasCards={hopperHasCards}
        isReady={isReady}
        isMonitoring={irMonitoring}
        onRead={handleReadIR}
        onToggleMonitor={handleToggleIrMonitor}
      />
      <BinRoutingControls
        activeBin={activeBin}
        isReady={isReady}
        isSampleRunning={isSampleRunning}
        onTestBin={handleTestBin}
        onSampleRun={handleSampleRun}
      />
    </>
  );
}
