import { SettingsSection } from "@/components/settings-section";
import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { DeleteDialog } from "@/components/delete-dialog";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { ConnectionSettingsPanel } from "@/features/calibration/components/connection-settings-panel";
import { ExperimentalFeaturesPanel } from "@/features/calibration/components/experimental-features-panel";
import { BinConfigurations } from "@/features/calibration/components/bin-configurations";
import { BinRoutingControls } from "@/features/calibration/components/bin-routing-controls";
import { IrSensorPanel } from "@/features/calibration/components/ir-sensor-panel";
import { ModuleCountStepper } from "@/features/calibration/components/module-count-stepper";
import { useBinHeights } from "@/features/calibration/api/use-bin-heights";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useDeviceTogglesDraft } from "@/features/calibration/api/use-device-toggles-draft";
import { useModuleCountConfig } from "@/features/calibration/api/use-module-count-config";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export default function CalibrateModulesPage() {
  const { t } = useTranslation("calibration");
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

  const binRoutes = useBinRoutes();
  const binHeights = useBinHeights();
  const moduleCountConfig = useModuleCountConfig();
  const deviceToggles = useDeviceTogglesDraft();
  const [confirmReduceOpen, setConfirmReduceOpen] = useState(false);

  const isDirty =
    binRoutes.isDirty ||
    binHeights.isDirty ||
    moduleCountConfig.isDirty ||
    deviceToggles.isDirty;
  const isSaving =
    binRoutes.isSaving ||
    binHeights.isSaving ||
    moduleCountConfig.isSaving ||
    deviceToggles.isSaving;

  function handleDiscard() {
    binRoutes.discard();
    binHeights.discard();
    moduleCountConfig.discard();
    deviceToggles.discard();
  }

  async function commitAll() {
    try {
      if (deviceToggles.isDirty) await deviceToggles.commit();
      if (moduleCountConfig.isDirty) await moduleCountConfig.commit();
      if (binRoutes.isDirty) await binRoutes.commit();
      if (binHeights.isDirty) await binHeights.commit();
    } catch {
      toast.error(t("modulesPage.toasts.saveFailed"));
    }
  }

  function handleSave() {
    if (moduleCountConfig.isReducing) {
      setConfirmReduceOpen(true);
      return;
    }
    void commitAll();
  }

  return (
    <>
      <ConnectionSettingsPanel
        values={deviceToggles.values}
        isLoaded={deviceToggles.isLoaded}
        onChange={deviceToggles.set}
      />
      <ExperimentalFeaturesPanel
        values={deviceToggles.values}
        isLoaded={deviceToggles.isLoaded}
        onChange={deviceToggles.set}
      />
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
      <SettingsSection
        dataTour="module-count"
        heading={t("moduleCountStepper.label")}
      >
        <ModuleCountStepper />
      </SettingsSection>
      <BinConfigurations />

      <DeleteDialog
        open={confirmReduceOpen}
        onOpenChange={setConfirmReduceOpen}
        title={t("moduleCountStepper.reduceConfirm.title")}
        description={t("moduleCountStepper.reduceConfirm.description", {
          count: moduleCountConfig.displayCount,
        })}
        confirmLabel={t("moduleCountStepper.reduceConfirm.confirm")}
        onConfirm={() => {
          setConfirmReduceOpen(false);
          void commitAll();
        }}
      />

      <SaveBar
        show={isDirty}
        onSave={handleSave}
        isSaving={isSaving}
        onDiscard={handleDiscard}
      />
      <UnsavedChangesGuard isDirty={isDirty} onDiscard={handleDiscard} />
    </>
  );
}
