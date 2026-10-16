import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useDeviceTogglesDraft } from "@/features/calibration/api/use-device-toggles-draft";
import { ConnectionSettingsPanel } from "@/features/calibration/components/connection-settings-panel";
import { ExperimentalFeaturesPanel } from "@/features/calibration/components/experimental-features-panel";
import { FirmwarePanel } from "@/features/calibration/components/firmware-panel";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { SorterWifiPanel } from "@/features/scanner/components/sorter-wifi-panel";
import { useTranslation } from "react-i18next";

export default function CalibrateConnectionPage() {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const deviceToggles = useDeviceTogglesDraft();

  async function handleSave() {
    try {
      await deviceToggles.commit();
    } catch {
      toast.error(t("modulesPage.toasts.saveFailed"));
    }
  }

  return (
    <>
      <ConnectionSettingsPanel
        values={deviceToggles.values}
        isLoaded={deviceToggles.isLoaded}
        onChange={deviceToggles.set}
      />
      <FirmwarePanel />
      <SorterWifiPanel />
      <ExperimentalFeaturesPanel
        values={deviceToggles.values}
        isLoaded={deviceToggles.isLoaded}
        onChange={deviceToggles.set}
      />

      <SaveBar
        show={deviceToggles.isDirty}
        onSave={() => void handleSave()}
        isSaving={deviceToggles.isSaving}
        onDiscard={deviceToggles.discard}
      />
      <UnsavedChangesGuard
        isDirty={deviceToggles.isDirty}
        onDiscard={deviceToggles.discard}
      />
    </>
  );
}
