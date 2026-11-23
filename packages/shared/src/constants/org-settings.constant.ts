import type { OrgRole } from "../interfaces/organization.interface";
import type { OrgSettings } from "../interfaces/org-settings.interface";
import { DEFAULT_CONDITION_MULTIPLIERS } from "./card-condition.constant";
import { DEFAULT_PRICE_SOURCE } from "./price-source.constant";

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  primaryColor: null,
  scannerLayout: "horizontal",
  discordNotifyOnScan: false,
  discordScanUseThreads: true,
  sessionWrappedEnabled: true,
  ocrEnabled: false,
  highAccuracyScans: false,
  foilDetectionEnabled: false,
  foilStarDetectionEnabled: false,
  correctionBinPrompt: true,
  pauseScanningOnDeploy: true,
  leaderboardOptIn: false,
  unmatchedCardsInGrid: false,
  correctionAutoCloseSeconds: null,
  priceSource: DEFAULT_PRICE_SOURCE,
  conditionMultipliers: DEFAULT_CONDITION_MULTIPLIERS,
  discordGuildId: null,
};

export const ORG_SETTINGS_MANAGER_ROLES: readonly OrgRole[] = ["owner", "admin"];

export const ORG_SETTINGS_MANAGER_ONLY_KEYS = [
  "leaderboardOptIn",
  "discordNotifyOnScan",
  "discordScanUseThreads",
  "priceSource",
  "conditionMultipliers",
] as const satisfies readonly (keyof OrgSettings)[];
