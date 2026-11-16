import type { ScanLockInfo } from "@magic-vault/shared";
import type { TradeOffer } from "@magic-vault/shared";
import type { AnnouncementSeverity, DeployNotice } from "@magic-vault/shared";

export type { ScanLockInfo };

export interface AppStreamValue {
  locks: Record<string, ScanLockInfo>;
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
  tradeOffers: TradeOffer[];
  onOpenTradeOffer: (guid: string) => void;
  onClose: () => void;
}


export interface AlertsRefresh {
  refresh: () => Promise<boolean>;
  isRefreshing: boolean;
}
