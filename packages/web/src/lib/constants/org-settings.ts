import { DEFAULT_PRICE_SOURCE, type PriceSource } from "@magic-vault/shared";

export interface OrgSettings {
  primaryColor: string | null;
  scannerLayout: "horizontal" | "vertical";
  discordNotifyOnScan: boolean;
  sessionWrappedEnabled: boolean;
  priceSource: PriceSource;
  discordGuildId: string | null;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  primaryColor: null,
  scannerLayout: "horizontal",
  discordNotifyOnScan: false,
  sessionWrappedEnabled: true,
  priceSource: DEFAULT_PRICE_SOURCE,
  discordGuildId: null,
};
