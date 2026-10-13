import { SettingsSection } from "@/components/settings-section";
import { DeleteDialog } from "@/components/delete-dialog";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { BinConfigurations } from "@/features/calibration/components/bin-configurations";
import { ModuleCountStepper } from "@/features/calibration/components/module-count-stepper";
import { useBinHeights } from "@/features/calibration/api/use-bin-heights";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useModuleCountConfig } from "@/features/calibration/api/use-module-count-config";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export default function CalibrateLayoutPage() {
  const { t } = useTranslation("calibration");
  const binRoutes = useBinRoutes();
  const binHeights = useBinHeights();
  const moduleCountConfig = useModuleCountConfig();
  const [confirmReduceOpen, setConfirmReduceOpen] = useState(false);

  const isDirty =
    binRoutes.isDirty || binHeights.isDirty || moduleCountConfig.isDirty;
  const isSaving =
    binRoutes.isSaving || binHeights.isSaving || moduleCountConfig.isSaving;

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
