import type { ConditionMultipliers } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";

export interface OrgSettings {
  primaryColor: string | null;
  scannerLayout: "horizontal" | "vertical";
  discordNotifyOnScan: boolean;
  discordScanUseThreads: boolean;
  sessionWrappedEnabled: boolean;
  ocrEnabled: boolean;
  correctionBinPrompt: boolean;
  pauseScanningOnDeploy: boolean;
  leaderboardOptIn: boolean;
  correctionAutoCloseSeconds: number | null;
  priceSource: PriceSource;
  conditionMultipliers: ConditionMultipliers;
  discordGuildId: string | null;
}
