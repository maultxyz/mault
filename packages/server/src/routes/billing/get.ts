import {
  LEGACY_BUSINESS_PLAN,
  LEGACY_BUSINESS_REPORTED_PLAN,
} from "@magic-vault/shared";
import { and, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { authQuery } from "../../db";
import { notificationRules, orgBilling, soundRules } from "../../db/schema";
import {
  countLiveCollections,
} from "../../lib/collection-limit";
import { memberLimitForPlan } from "../../lib/member-seat-limit";
import {
  countOwnedOrganizations,
} from "../../lib/organization-limit";
import {
  planHasFeature,
  toPlanKey,
  connectedSorterLimitForPlan,
  planLimit,
} from "../../lib/plan-config";
import { currentPreviewPlan } from "../../lib/plan-preview";
import { isLegacyPricingActive } from "../../lib/pricing-mode";
import {
  dailyScanLimitForPlan,
  getScansThisMonth,
  getScansToday,
} from "../../lib/scan-usage";
import {
  countLiveStorageLocations,
} from "../../lib/storage-access";
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
      const scansToday = await getScansToday(tx, orgId);
      const scansThisMonth = await getScansThisMonth(tx, orgId);
      const collectionCount = await countLiveCollections(tx, orgId);
      const storageLocationCount = await countLiveStorageLocations(tx, orgId);
      const [{ soundRuleCount }] = await tx
        .select({ soundRuleCount: count() })
        .from(soundRules)
        .where(
          and(eq(soundRules.orgId, orgId), eq(soundRules.isDeleted, false)),
        );
      const [{ notificationRuleCount }] = await tx
        .select({ notificationRuleCount: count() })
        .from(notificationRules)
        .where(
          and(
            eq(notificationRules.orgId, orgId),
            eq(notificationRules.isDeleted, false),
          ),
        );

      const previewPlan = currentPreviewPlan();
      const plan = previewPlan ?? toPlanKey(billing?.plan);
      return {
        success: true,
        message: "Loaded.",
        data: {
          plan:
            plan === LEGACY_BUSINESS_PLAN
              ? LEGACY_BUSINESS_REPORTED_PLAN
              : plan,
          isLegacyPlan:
            plan === LEGACY_BUSINESS_PLAN && !isLegacyPricingActive(),
          isPlanPreview: !!previewPlan,
          status: billing?.status ?? null,
          cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
          currentPeriodEnd: billing?.currentPeriodEnd ?? null,
          interval:
            plan === "free"
              ? null
              : (findPlanForPriceId(billing?.stripePriceId)?.interval ?? null),
          prices: planPrices.business,
          planPrices,
          cardsScannedToday: scansToday,
          cardsScannedThisMonth: scansThisMonth,
          dailyLimit: dailyScanLimitForPlan(plan),
          maxOrganizations: planLimit(plan, "organizations"),
          ownedOrganizations,
          maxMembersPerOrg: memberLimitForPlan(plan),
          memberCount: memberUserIds.length,
          maxConnectedSorters: connectedSorterLimitForPlan(plan),
          maxSoundRules: planLimit(plan, "soundRules"),
          soundRuleCount,
          maxNotificationRules: planLimit(plan, "notificationRules"),
          notificationRuleCount,
          maxCollections: planLimit(plan, "collections"),
          collectionCount,
          chaosSort: planHasFeature(plan, "chaosSort"),
          repacks: planHasFeature(plan, "repacks"),
          customSounds: planHasFeature(plan, "customSounds"),
          fleetHealth: planHasFeature(plan, "fleetHealth"),
          storage: planHasFeature(plan, "storage"),
          storageLocationCount,
          apiAccess: planHasFeature(plan, "apiAccess"),
          businessTools: planHasFeature(plan, "businessTools"),
          longShareLinks: planHasFeature(plan, "longShareLinks"),
        },
      };
    });
    return c.json(result);
  },
);
