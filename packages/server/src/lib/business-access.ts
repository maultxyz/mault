import {
  toBusinessPermissions,
  toBuylistConfig,
  type BusinessAccess,
  type BusinessPermissionKey,
  type BusinessSettings,
  type OrgRole,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import type { db, Transaction } from "../db";
import { orgSettings } from "../db/schema";
import { BUSINESS_MANAGER_ROLES } from "./constants/business";
import {
  ORG_BUSINESS_SETTINGS_CACHE_TTL_MS,
  ORG_BUSINESS_SETTINGS_CACHE_VARIANT_KEY,
  ORG_SETTINGS_READ_CACHE_MAX_ENTRIES,
} from "./constants/org-settings-read-cache";
import { createOrgReadCache } from "./org-read-cache";
import { orgHasFeature } from "./plan-config";
import { loadOrgPricing } from "./price-source";

const businessSettingsCache = createOrgReadCache<BusinessSettings>(
  ORG_BUSINESS_SETTINGS_CACHE_TTL_MS,
  ORG_SETTINGS_READ_CACHE_MAX_ENTRIES,
);

export function isBusinessManager(role: OrgRole): boolean {
  return BUSINESS_MANAGER_ROLES.includes(role);
}

export function loadBusinessSettings(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<BusinessSettings> {
  return businessSettingsCache.get(
    orgId,
    ORG_BUSINESS_SETTINGS_CACHE_VARIANT_KEY,
    async () => {
      const row = await runner.query.orgSettings.findFirst({
        where: eq(orgSettings.orgId, orgId),
        columns: { buylistConfig: true, businessPermissions: true },
      });
      return {
        buylist: toBuylistConfig(row?.buylistConfig),
        permissions: toBusinessPermissions(row?.businessPermissions),
      };
    },
  );
}

export async function loadBusinessAccess(
  tx: Transaction,
  orgId: string,
  role: OrgRole,
): Promise<BusinessAccess> {
  const settings = await loadBusinessSettings(tx, orgId);
  const allowed = await orgHasFeature(tx, orgId, "businessTools");
  const pricing = await loadOrgPricing(tx, orgId);
  const manager = isBusinessManager(role);
  const can = (key: BusinessPermissionKey) =>
    manager || settings.permissions[key];
  return {
    isLocked: !allowed,
    canManageSettings: manager,
    canViewCosts: can("viewCosts"),
    canAcceptIntake: can("acceptIntake"),
    canFulfilOrders: can("fulfilOrders"),
    canViewActivity: can("viewActivity"),
    priceSource: pricing.source,
  };
}

export async function canViewCardCosts(
  tx: Transaction,
  orgId: string,
  role: OrgRole,
): Promise<boolean> {
  const access = await loadBusinessAccess(tx, orgId, role);
  return !access.isLocked && access.canViewCosts;
}
