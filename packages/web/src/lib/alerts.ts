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

