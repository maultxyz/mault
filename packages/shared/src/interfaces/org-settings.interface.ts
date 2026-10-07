import type { PriceSource } from "./price-source.interface";

export interface OrgSettings {
  primaryColor: string | null;
  scannerLayout: "horizontal" | "vertical";
  discordNotifyOnScan: boolean;
  discordScanUseThreads: boolean;
  sessionWrappedEnabled: boolean;
  ocrEnabled: boolean;
  correctionBinPrompt: boolean;
  correctionAutoCloseSeconds: number | null;
  priceSource: PriceSource;
  discordGuildId: string | null;
}
