import type { BillingStatus, PlanSettings } from "@magic-vault/shared";

export function billingPlanSettings(billing: BillingStatus): PlanSettings {
  return {
    features: {
      chaosSort: billing.chaosSort ?? false,
      repacks: billing.repacks ?? false,
      customSounds: billing.customSounds ?? false,
      storage: billing.storage ?? false,
      apiAccess: billing.apiAccess ?? false,
      businessTools: billing.businessTools ?? false,
    },
    limits: {
      dailyScans: billing.dailyLimit,
      organizations: billing.maxOrganizations ?? null,
      membersPerOrg: billing.maxMembersPerOrg ?? null,
      connectedSorters: billing.maxConnectedSorters ?? null,
      soundRules: billing.maxSoundRules ?? null,
      notificationRules: billing.maxNotificationRules ?? null,
      collections: billing.maxCollections ?? null,
    },
  };
}
