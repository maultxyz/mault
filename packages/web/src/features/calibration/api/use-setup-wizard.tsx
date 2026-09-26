import {
  devicesQueryOptions,
  saveDevice,
  type Device,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSerial } from "@/features/scanner/api/use-serial";
import type { SetupWizardContextValue } from "@/lib/interfaces/calibration";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null);

// Opens on its own once a board that hasn't been through setup connects, and
// on request (the calibration page's "Run setup wizard"). Closing only hides
// it for that device until the next time it's opened by hand; finishing or
// skipping is what records setup as done (see DeviceSetupWizard).
export function SetupWizardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("calibration");
  const { isConnected } = useSerial();
  const device = useDevice();
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const [closedForGuid, setClosedForGuid] = useState<string | null>(null);

  const needsSetup =
    isConnected &&
    !!device?.guid &&
    !device.setupCompletedAt &&
    closedForGuid !== device.guid;

  const open = useCallback(() => setManuallyOpen(true), []);
  const close = useCallback(() => {
    setManuallyOpen(false);
    setClosedForGuid(device?.guid ?? null);
  }, [device?.guid]);

  // Clears the sorter's setup flag, so the wizard opens (and can only be
  // left through Finish or Skip) now if it's connected, or on its next connect.
  const forceSetup = useCallback(async () => {
    if (!device?.guid) return;
    const result = await saveDevice(device.guid, {
      setupCompleted: false,
    }).catch(() => null);
    if (!result?.success || !result.data) {
      toast.error(t("setupWizard.forceFailed"));
      return;
    }
    const saved = result.data;
    queryClient.setQueryData(
      devicesQueryOptions(activeOrg?.id).queryKey,
      (old: Device[] | undefined) =>
        old?.map((d) => (d.guid === saved.guid ? saved : d)),
    );
    setClosedForGuid(null);
    toast.success(t("setupWizard.forced"), {
      description: isConnected
        ? undefined
        : t("setupWizard.forcedNextConnect", { name: saved.name }),
    });
  }, [device?.guid, activeOrg?.id, queryClient, isConnected, t]);

  return (
    <SetupWizardContext
      value={{
        isOpen: isConnected && (manuallyOpen || needsSetup),
        open,
        close,
        forceSetup,
      }}
    >
      {children}
    </SetupWizardContext>
  );
}

export function useSetupWizard() {
  const context = useContext(SetupWizardContext);
  if (!context) {
    throw new Error("useSetupWizard must be used within a SetupWizardProvider");
  }
  return context;
}
