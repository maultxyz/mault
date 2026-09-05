import type { AnnouncementSeverity } from "@magic-vault/shared";
import type { ComponentType, ReactNode } from "react";

export type AlertSeverity = AnnouncementSeverity;

export interface AppAlert {
  id: string;
  severity: AlertSeverity;
  icon: ComponentType<{ className?: string }>;
  message: ReactNode;
  actions?: ReactNode;
}

export const ALERT_SEVERITY_BANNER_CLASS: Record<AlertSeverity, string> = {
  info: "border-blue-500/30 bg-blue-400/20 text-blue-900 dark:bg-blue-400/10 dark:text-blue-200",
  warning:
    "border-amber-500/30 bg-amber-400/20 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200",
  danger:
    "border-red-500/30 bg-red-500/20 text-red-900 dark:bg-red-500/10 dark:text-red-300",
};

export const ALERT_SEVERITY_ICON_CLASS: Record<AlertSeverity, string> = {
  info: "text-blue-800 dark:text-blue-400",
  warning: "text-amber-800 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};
