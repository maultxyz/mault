import { useAppVersionAlert } from "@/hooks/alerts/use-app-version-alert";
import { useChannelLayoutAlert } from "@/hooks/alerts/use-channel-layout-alert";
import { useEmailVerificationAlert } from "@/hooks/alerts/use-email-verification-alert";
import { useFirmwareMissingAlert } from "@/hooks/alerts/use-firmware-missing-alert";
import { useFirmwareVersionAlert } from "@/hooks/alerts/use-firmware-version-alert";
import type { AppAlert } from "@/lib/alerts";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AppAlertsContextValue {
  visibleAlerts: AppAlert[];
  trayAlerts: AppAlert[];
  portals: ReactNode;
  dismiss: (id: string) => void;
}

const AppAlertsContext = createContext<AppAlertsContextValue | null>(null);

const DISMISSED_STORAGE_KEY = "magic-vault:dismissed-alerts";

export function AppAlertsProvider({ children }: { children: ReactNode }) {
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (raw) setDismissedIds(JSON.parse(raw));
    } catch {}
  }, []);

  const emailVerification = useEmailVerificationAlert();
  const channelLayout = useChannelLayoutAlert();
  const appVersion = useAppVersionAlert();
  const firmwareVersion = useFirmwareVersionAlert();
  const firmwareMissing = useFirmwareMissingAlert();

  const alerts = useMemo(
    () =>
      [
        emailVerification,
        channelLayout,
        appVersion,
        firmwareVersion.alert,
        firmwareMissing,
      ].filter((alert): alert is AppAlert => alert !== null),
    [
      emailVerification,
      channelLayout,
      appVersion,
      firmwareVersion.alert,
      firmwareMissing,
    ],
  );

  const value = useMemo<AppAlertsContextValue>(
    () => ({
      visibleAlerts: alerts.filter((a) => !dismissedIds[a.id]),
      trayAlerts: alerts.filter((a) => dismissedIds[a.id]),
      portals: firmwareVersion.portal,
      dismiss: (id) =>
        setDismissedIds((prev) => {
          const next = { ...prev, [id]: true };
          try {
            localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        }),
    }),
    [alerts, dismissedIds, firmwareVersion.portal],
  );

  return (
    <AppAlertsContext.Provider value={value}>
      {children}
    </AppAlertsContext.Provider>
  );
}

export function useAppAlertsContext(): AppAlertsContextValue {
  const ctx = useContext(AppAlertsContext);
  if (!ctx) {
    throw new Error(
      "useAppAlertsContext must be used within AppAlertsProvider",
    );
  }
  return ctx;
}
