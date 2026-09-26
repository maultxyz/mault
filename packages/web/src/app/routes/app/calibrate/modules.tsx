import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import { DeleteDialog } from "@/components/delete-dialog";
import { SaveBar } from "@/components/save-bar";
import { Label } from "@/components/ui/label";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { BinConfigurations } from "@/features/calibration/components/bin-configurations";
import { BinRoutingControls } from "@/features/calibration/components/bin-routing-controls";
import { ChannelLayoutToggle } from "@/features/calibration/components/channel-layout-toggle";
import { IrSensorPanel } from "@/features/calibration/components/ir-sensor-panel";
import { ModuleCountStepper } from "@/features/calibration/components/module-count-stepper";
import { useBinHeights } from "@/features/calibration/api/use-bin-heights";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useModuleCountConfig } from "@/features/calibration/api/use-module-count-config";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  const [confirmReduceOpen, setConfirmReduceOpen] = useState(false);

  const isDirty = binRoutes.isDirty || binHeights.isDirty || moduleCountConfig.isDirty;
  const isSaving = binRoutes.isSaving || binHeights.isSaving || moduleCountConfig.isSaving;

  function handleDiscard() {
    binRoutes.discard();
    binHeights.discard();
    moduleCountConfig.discard();
  }

  async function commitAll() {
    try {
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
      <div className="flex flex-col gap-1.5" data-tour="channel-layout">
        <Label>{t("channelLayoutToggle.label")}</Label>
        <ChannelLayoutToggle />
      </div>
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
      <div className="flex flex-col gap-1.5" data-tour="module-count">
        <Label>{t("moduleCountStepper.label")}</Label>
        <ModuleCountStepper />
      </div>
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
