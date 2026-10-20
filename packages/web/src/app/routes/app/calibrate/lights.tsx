import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useLightSettingsDraft } from "@/features/calibration/api/use-light-settings-draft";
import { LightingPanel } from "@/features/calibration/components/lighting-panel";

export default function CalibrateLightsPage() {
  const lights = useLightSettingsDraft();

  return (
    <>
      <LightingPanel
        control={lights.control}
        isLoaded={lights.isLoaded}
        canControl={lights.canControl}
        onPreview={lights.schedulePreview}
        onTestCelebration={lights.testCelebration}
        onClearAlert={lights.clearAlert}
      />

      <SaveBar
        show={lights.isDirty}
        onSave={lights.save}
        isSaving={lights.isSaving}
        onDiscard={lights.discard}
      />
      <UnsavedChangesGuard isDirty={lights.isDirty} onDiscard={lights.discard} />
    </>
  );
}
