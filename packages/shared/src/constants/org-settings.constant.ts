import type { OrgSettings } from "../interfaces/org-settings.interface";
import { DEFAULT_PRICE_SOURCE } from "./price-source.constant";

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  primaryColor: null,
  scannerLayout: "horizontal",
  discordNotifyOnScan: false,
  discordScanUseThreads: true,
  sessionWrappedEnabled: true,
  ocrEnabled: false,
  correctionBinPrompt: true,
  pauseScanningOnDeploy: true,
  correctionAutoCloseSeconds: null,
  priceSource: DEFAULT_PRICE_SOURCE,
  discordGuildId: null,
};
