import type { TFunction } from "i18next";
import type { BillingStatus } from "@magic-vault/shared";

function limitLine(t: TFunction, limit: number | null | undefined, unlimitedKey: string, limitedKey: string): string {
  return limit == null
    ? t(`settings.billing.features.${unlimitedKey}`)
    : t(`settings.billing.features.${limitedKey}`, { count: limit });
}

export function planFeatureLines(t: TFunction, billing: BillingStatus): string[] {
  const featureLine = (enabled: boolean | undefined, key: string) =>
    enabled === false ? null : t(`settings.billing.features.${key}`);
  return [
    billing.dailyLimit == null
      ? t("settings.billing.features.unlimitedScans")
      : t("settings.billing.features.scanLimit", { limit: billing.dailyLimit }),
    limitLine(t, billing.maxOrganizations, "unlimitedOrganizations", "organizations"),
    limitLine(t, billing.maxMembersPerOrg, "unlimitedMembers", "members"),
    limitLine(t, billing.maxCollections, "unlimitedCollections", "collections"),
    limitLine(t, billing.maxConnectedSorters, "unlimitedSorters", "sorters"),
    limitLine(t, billing.maxSoundRules, "unlimitedSoundRules", "soundRules"),
    limitLine(t, billing.maxNotificationRules, "unlimitedNotificationRules", "notificationRules"),
    featureLine(billing.chaosSort, "chaosSort"),
    featureLine(billing.repacks, "repacks"),
    featureLine(billing.customSounds, "customSounds"),
    featureLine(billing.storage, "storage"),
    featureLine(billing.apiAccess, "apiAccess"),
    featureLine(billing.businessTools, "businessTools"),
    t("settings.billing.features.games"),
    t("settings.billing.features.notifications"),
  ].filter((line): line is string => !!line);
}
