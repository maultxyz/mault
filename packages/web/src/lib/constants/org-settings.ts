import { DEFAULT_PRICE_SOURCE, type PriceSource } from "@magic-vault/shared";

export interface OrgSettings {
  primaryColor: string | null;
  scannerLayout: "horizontal" | "vertical";
  discordNotifyOnScan: boolean;
  discordScanUseThreads: boolean;
  sessionWrappedEnabled: boolean;
  ocrEnabled: boolean;
  correctionAutoCloseSeconds: number | null;
  priceSource: PriceSource;
  discordGuildId: string | null;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  primaryColor: null,
  scannerLayout: "horizontal",
  discordNotifyOnScan: false,
  discordScanUseThreads: true,
  sessionWrappedEnabled: true,
  ocrEnabled: false,
  correctionAutoCloseSeconds: null,
  priceSource: DEFAULT_PRICE_SOURCE,
  discordGuildId: null,
};
