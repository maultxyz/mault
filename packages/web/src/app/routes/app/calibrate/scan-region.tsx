import { useDevice } from "@/features/calibration/api/use-device";
import { useCameraSettingsDraft } from "@/features/calibration/api/use-camera-settings-draft";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { useTranslation } from "react-i18next";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { ScanRegionCalibrationPanel } from "@/features/calibration/components/scan-region-calibration-panel";

export default function CalibrateScanRegionPage() {
  const device = useDevice();
  return <CameraSettingsPage key={device?.guid ?? "unbound"} />;
}

function CameraSettingsPage() {
  const cameraSettings = useCameraSettingsDraft();
  const toast = useStationToast();
  const { t } = useTranslation("calibration");
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

  const save = async () => {
    try {
      await cameraSettings.commit();
      if (isScanRegionSectionDirty) await handleSaveScanRegion();
      else toast.success(t("useCalibrationPage.toasts.calibrationSaved"));
    } catch {
      toast.error(t("useCalibrationPage.toasts.saveCalibrationFailed"));
    }
  };
  const discard = async () => {
    try {
      await cameraSettings.discard();
      handleDiscardScanRegion();
    } catch (error) {
      toast.error(t("useCalibrationPage.toasts.saveCalibrationFailed"));
      throw error;
    }
  };
  const isDirty = isScanRegionSectionDirty || cameraSettings.isDirty;

  return (
    <>
      <ScanRegionCalibrationPanel
        cameraSettings={cameraSettings}
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

      <SaveBar
        show={isDirty}
        onSave={() => void save()}
        isSaving={isSavingScanRegion || cameraSettings.isSaving}
        onDiscard={() => void discard().catch(() => {})}
      />
      <UnsavedChangesGuard
        isDirty={isDirty}
        onDiscard={discard}
      />
    </>
  );
}
