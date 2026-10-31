import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { authQuery } from "../../db";
import { orgBilling } from "../../db/schema";
import { apiAccessAllowedForPlan } from "../../lib/api-access";
import { businessToolsAllowedForPlan } from "../../lib/business-access";
import { chaosSortAllowedForPlan } from "../../lib/chaos-sort-access";
import {
  collectionLimitForPlan,
  countLiveCollections,
} from "../../lib/collection-limit";
import { memberLimitForPlan } from "../../lib/member-seat-limit";
import { notificationRuleLimitForPlan } from "../../lib/notification-rule-limit";
import {
  countOwnedOrganizations,
  organizationLimitForPlan,
} from "../../lib/organization-limit";
import { toPlanKey } from "../../lib/plan-config";
import { repacksAllowedForPlan } from "../../lib/repack-access";
import { customSoundsAllowedForPlan } from "../../lib/custom-sounds-access";
import { dailyScanLimitForPlan, getScansToday } from "../../lib/scan-usage";
import { sorterLimitForPlan } from "../../lib/sorter-limit";
import { soundRuleLimitForPlan } from "../../lib/sound-rule-limit";
import { storageAllowedForPlan } from "../../lib/storage-access";
import { findPlanForPriceId, getPaidPlanPrices } from "../../lib/stripe";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const getBillingRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const [planPrices, ownedOrganizations, memberUserIds] = await Promise.all([
      getPaidPlanPrices(),
      countOwnedOrganizations(c.get("userId")),
      authProvider.listOrgMemberUserIdsBySeat(orgId),
    ]);
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const billing = await tx.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
      });
      const count = await getScansToday(tx, orgId);
      const collectionCount = await countLiveCollections(tx, orgId);

      const plan = toPlanKey(billing?.plan);
      return {
        success: true,
        message: "Loaded.",
        data: {
          plan,
          status: billing?.status ?? null,
          cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
          currentPeriodEnd: billing?.currentPeriodEnd ?? null,
          interval:
            plan === "free"
              ? null
              : (findPlanForPriceId(billing?.stripePriceId)?.interval ?? null),
          prices: planPrices.business,
          planPrices,
          cardsScannedToday: count,
          dailyLimit: dailyScanLimitForPlan(plan),
          maxOrganizations: organizationLimitForPlan(plan),
          ownedOrganizations,
          maxMembersPerOrg: memberLimitForPlan(plan),
          memberCount: memberUserIds.length,
          maxConnectedSorters: sorterLimitForPlan(plan),
          maxSoundRules: soundRuleLimitForPlan(plan),
          maxNotificationRules: notificationRuleLimitForPlan(plan),
          maxCollections: collectionLimitForPlan(plan),
          collectionCount,
          chaosSort: chaosSortAllowedForPlan(plan),
          repacks: repacksAllowedForPlan(plan),
          customSounds: customSoundsAllowedForPlan(plan),
          storage: storageAllowedForPlan(plan),
          apiAccess: apiAccessAllowedForPlan(plan),
          businessTools: businessToolsAllowedForPlan(plan),
        },
      };
    });
    return c.json(result);
  },
);
