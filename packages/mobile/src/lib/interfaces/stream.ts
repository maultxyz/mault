import type { AnnouncementSeverity, DeployNotice } from "@magic-vault/shared";

export interface ScanLockInfo {
  userId: string;
  displayName: string;
  expiresAt: number;
}

export interface AppStreamValue {
  locks: Record<string, ScanLockInfo>;
  liveCounts: Record<string, number>;
  deployNotice: DeployNotice | null;
}

export interface AppAlert {
  id: string;
  severity: AnnouncementSeverity;
  message: string;
  link?: string | null;
}

export interface AlertsSheetProps {
  visible: boolean;
  alerts: AppAlert[];
  onClose: () => void;
}

