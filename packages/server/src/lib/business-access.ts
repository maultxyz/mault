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
import { orgHasFeature, planHasFeature } from "./plan-config";
import { loadOrgPricing } from "./price-source";

export function businessToolsAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "businessTools");
}

export function isBusinessToolsAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "businessTools");
}

export function isBusinessManager(role: OrgRole): boolean {
  return BUSINESS_MANAGER_ROLES.includes(role);
}

export async function loadBusinessSettings(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<BusinessSettings> {
  const row = await runner.query.orgSettings.findFirst({
    where: eq(orgSettings.orgId, orgId),
    columns: { buylistConfig: true, businessPermissions: true },
  });
  return {
    buylist: toBuylistConfig(row?.buylistConfig),
    permissions: toBusinessPermissions(row?.businessPermissions),
  };
}

export async function loadBusinessAccess(
  tx: Transaction,
  orgId: string,
  role: OrgRole,
): Promise<BusinessAccess> {
  const settings = await loadBusinessSettings(tx, orgId);
  const allowed = await isBusinessToolsAllowed(tx, orgId);
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
