import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { ScanRegionCalibrationPanel } from "@/features/calibration/components/scan-region-calibration-panel";

export default function CalibrateScanRegionPage() {
  const {
    scanRegion,
    captureSettleDelayMs,
    matchesNeeded,
    isDeviceLoading,
    handleScanRegionChange,
    handleResetScanRegion,
    handleCaptureSettleChange,
    handleMatchesNeededChange,
    isScanRegionSectionDirty,
    isSavingScanRegion,
    handleSaveScanRegion,
    handleDiscardScanRegion,
  } = useCalibrationOutletContext();

  return (
    <>
      <ScanRegionCalibrationPanel
        scanRegion={scanRegion}
        captureSettleDelayMs={captureSettleDelayMs}
        matchesNeeded={matchesNeeded}
        isLoading={isDeviceLoading}
        onRegionChange={handleScanRegionChange}
        onResetRegion={handleResetScanRegion}
        onCaptureSettleChange={handleCaptureSettleChange}
        onMatchesNeededChange={handleMatchesNeededChange}
      />

      <SaveBar
        show={isScanRegionSectionDirty}
        onSave={handleSaveScanRegion}
        isSaving={isSavingScanRegion}
        onDiscard={handleDiscardScanRegion}
      />
      <UnsavedChangesGuard
        isDirty={isScanRegionSectionDirty}
        onDiscard={handleDiscardScanRegion}
      />
    </>
  );
}
