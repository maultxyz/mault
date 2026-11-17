import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { ScanRegionCalibrationPanel } from "@/features/calibration/components/scan-region-calibration-panel";
import { FoilCalibrationPanel } from "@/features/calibration/components/foil-calibration-panel";
import { useFoilCalibration } from "@/features/calibration/api/use-foil-calibration";

export default function CalibrateScanRegionPage() {
  const {
    scanRegion,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    flipCamera,
    isDeviceLoading,
    handleScanRegionChange,
    handleResetScanRegion,
    handleCaptureSettleChange,
    handleMatchesNeededChange,
    handleCheckBothOrientationsChange,
    handleFlipCameraChange,
    isScanRegionSectionDirty,
    isSavingScanRegion,
    handleSaveScanRegion,
    handleDiscardScanRegion,
  } = useCalibrationOutletContext();
  const foilCalibration = useFoilCalibration({
    scanRegion,
    captureSettleDelayMs,
    disabled: isDeviceLoading || isScanRegionSectionDirty || isSavingScanRegion,
  });

  return (
    <>
      <fieldset disabled={foilCalibration.busy} inert={foilCalibration.busy} className="contents">
        <ScanRegionCalibrationPanel
        scanRegion={scanRegion}
        captureSettleDelayMs={captureSettleDelayMs}
        matchesNeeded={matchesNeeded}
        checkBothOrientations={checkBothOrientations}
        flipCamera={flipCamera}
        isLoading={isDeviceLoading}
        onRegionChange={handleScanRegionChange}
        onResetRegion={handleResetScanRegion}
        onCaptureSettleChange={handleCaptureSettleChange}
        onMatchesNeededChange={handleMatchesNeededChange}
        onCheckBothOrientationsChange={handleCheckBothOrientationsChange}
        onFlipCameraChange={handleFlipCameraChange}
        />
      </fieldset>
      <FoilCalibrationPanel calibration={foilCalibration} />

      <SaveBar
        show={isScanRegionSectionDirty}
        onSave={handleSaveScanRegion}
        isSaving={isSavingScanRegion}
        onDiscard={handleDiscardScanRegion}
      />
      <UnsavedChangesGuard
        isDirty={isScanRegionSectionDirty || foilCalibration.busy}
        onDiscard={() => {
          foilCalibration.cancel();
          handleDiscardScanRegion();
        }}
      />
    </>
  );
}
