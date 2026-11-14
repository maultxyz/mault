import type { AnnouncementSeverity } from "@magic-vault/shared";
import type { ComponentType, ReactElement, ReactNode } from "react";

export type AlertSeverity = AnnouncementSeverity;

export interface AppAlert {
  id: string;
  severity: AlertSeverity;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  message: ReactNode;
  link?: string | null;
  actions?: ReactNode;
}

export interface AppAlertsContextValue {
  visibleAlerts: AppAlert[];
  trayAlerts: AppAlert[];
  portals: ReactNode;
  dismiss: (id: string) => void;
}

export interface AlertTrayItemProps {
  alert: AppAlert;
}

export interface AlertTrayTriggerProps {
  trigger: (count: number) => ReactElement;
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
}

export interface AlertTrayRefresh {
  refresh: () => Promise<boolean>;
  isRefreshing: boolean;
}
