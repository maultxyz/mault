import {
  canManageOrgSettings,
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  DEFAULT_ORG_SETTINGS,
  ORG_SETTINGS_MANAGER_ONLY_KEYS,
  isConditionMultiplier,
  isPriceSource,
  toConditionMultipliers,
  toCorrectionAutoCloseSeconds,
  toPriceSource,
  type OrgPricing,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { forgetLeaderboardOptIns } from "../../lib/leaderboard";
import { refreshOrgCardSnapshotsForPricing } from "../../lib/org-card-value-summary";
import { forgetShopCatalogReadsForOrg } from "../../lib/shop-catalogs";
import { orgSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const editOrgSettingsRoute = new Hono<AppEnv>().put(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{
      primaryColor?: string | null;
      scannerLayout?: string | null;
      discordNotifyOnScan?: boolean;
      discordScanUseThreads?: boolean;
      sessionWrappedEnabled?: boolean;
      ocrEnabled?: boolean;
      highAccuracyScans?: boolean;
      foilDetectionEnabled?: boolean;
      foilStarDetectionEnabled?: boolean;
      correctionBinPrompt?: boolean;
      pauseScanningOnDeploy?: boolean;
      leaderboardOptIn?: boolean;
      unmatchedCardsInGrid?: boolean;
      correctionAutoCloseSeconds?: number | null;
      priceSource?: string;
      conditionMultipliers?: Record<string, unknown>;
    }>();
    if (
      body.correctionAutoCloseSeconds != null &&
      toCorrectionAutoCloseSeconds(body.correctionAutoCloseSeconds) == null
    ) {
      return c.json(
        { success: false, message: "Invalid auto-close time." },
        400,
      );
    }
    if ("priceSource" in body && !isPriceSource(body.priceSource)) {
      return c.json(
        { success: false, message: "Invalid price source." },
        400,
      );
    }
    if (
      "conditionMultipliers" in body &&
      CARD_CONDITIONS.some(
        (condition) =>
          condition !== DEFAULT_CARD_CONDITION &&
          !isConditionMultiplier(body.conditionMultipliers?.[condition]),
      )
    ) {
      return c.json(
        { success: false, message: "Invalid condition multipliers." },
        400,
      );
    }
    const pricingChange: { savedPricing: OrgPricing | null } = { savedPricing: null };
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.orgSettings.findFirst({
        where: eq(orgSettings.orgId, orgId),
      });

      const merged = {
        primaryColor:
          "primaryColor" in body
            ? (body.primaryColor ?? null)
            : (existing?.primaryColor ?? null),
        scannerLayout:
          "scannerLayout" in body
            ? (body.scannerLayout ?? null)
            : (existing?.scannerLayout ?? null),
        discordNotifyOnScan:
          "discordNotifyOnScan" in body
            ? (body.discordNotifyOnScan ?? false)
            : (existing?.discordNotifyOnScan ?? false),
        discordScanUseThreads:
          "discordScanUseThreads" in body
            ? (body.discordScanUseThreads ?? true)
            : (existing?.discordScanUseThreads ?? true),
        sessionWrappedEnabled:
          "sessionWrappedEnabled" in body
            ? (body.sessionWrappedEnabled ?? true)
            : (existing?.sessionWrappedEnabled ?? true),
        ocrEnabled:
          "ocrEnabled" in body
            ? (body.ocrEnabled ?? false)
            : (existing?.ocrEnabled ?? false),
        highAccuracyScans:
          "highAccuracyScans" in body
            ? (body.highAccuracyScans ?? false)
            : (existing?.highAccuracyScans ?? false),
        foilDetectionEnabled:
          "foilDetectionEnabled" in body
            ? (body.foilDetectionEnabled ?? false)
            : (existing?.foilDetectionEnabled ?? false),
        foilStarDetectionEnabled:
          "foilStarDetectionEnabled" in body
            ? (body.foilStarDetectionEnabled ?? false)
            : (existing?.foilStarDetectionEnabled ?? false),
        correctionBinPrompt:
          "correctionBinPrompt" in body
            ? (body.correctionBinPrompt ?? true)
            : (existing?.correctionBinPrompt ?? true),
        pauseScanningOnDeploy:
          "pauseScanningOnDeploy" in body
            ? (body.pauseScanningOnDeploy ?? true)
            : (existing?.pauseScanningOnDeploy ?? true),
        leaderboardOptIn:
          "leaderboardOptIn" in body
            ? (body.leaderboardOptIn ?? false)
            : (existing?.leaderboardOptIn ?? false),
        unmatchedCardsInGrid:
          "unmatchedCardsInGrid" in body
            ? (body.unmatchedCardsInGrid ?? false)
            : (existing?.unmatchedCardsInGrid ?? false),
        correctionAutoCloseSeconds: toCorrectionAutoCloseSeconds(
          "correctionAutoCloseSeconds" in body
            ? body.correctionAutoCloseSeconds
            : existing?.correctionAutoCloseSeconds,
        ),
        priceSource: toPriceSource(
          "priceSource" in body ? body.priceSource : existing?.priceSource,
        ),
        conditionMultipliers: toConditionMultipliers(
          "conditionMultipliers" in body
            ? body.conditionMultipliers
            : existing?.conditionMultipliers,
        ),
      };
      const current = {
        leaderboardOptIn: existing?.leaderboardOptIn ?? DEFAULT_ORG_SETTINGS.leaderboardOptIn,
        discordNotifyOnScan:
          existing?.discordNotifyOnScan ?? DEFAULT_ORG_SETTINGS.discordNotifyOnScan,
        discordScanUseThreads:
          existing?.discordScanUseThreads ?? DEFAULT_ORG_SETTINGS.discordScanUseThreads,
        priceSource: toPriceSource(existing?.priceSource),
        conditionMultipliers: toConditionMultipliers(existing?.conditionMultipliers),
      };
      const changesManagerOnlySetting = ORG_SETTINGS_MANAGER_ONLY_KEYS.some(
        (key) => JSON.stringify(merged[key]) !== JSON.stringify(current[key]),
      );
      if (changesManagerOnlySetting && !canManageOrgSettings(c.get("orgRole"))) {
        return {
          success: false,
          message:
            "Only organization owners and admins can change pricing, the leaderboard listing and Discord scan posts.",
        };
      }

      const savedPricing: OrgPricing = {
        source: merged.priceSource,
        conditionMultipliers: merged.conditionMultipliers,
      };
      const currentPricing: OrgPricing = {
        source: current.priceSource,
        conditionMultipliers: current.conditionMultipliers,
      };
      if (JSON.stringify(savedPricing) !== JSON.stringify(currentPricing)) {
        pricingChange.savedPricing = savedPricing;
      }

      await tx
        .insert(orgSettings)
        .values({ orgId, ...merged })
        .onConflictDoUpdate({
          target: [orgSettings.orgId],
          set: { ...merged, updatedAt: new Date() },
        });

      return {
        success: true,
        message: "Saved.",
        data: {
          primaryColor: merged.primaryColor,
          scannerLayout:
            (merged.scannerLayout as "horizontal" | "vertical") ??
            "horizontal",
          discordNotifyOnScan: merged.discordNotifyOnScan,
          discordScanUseThreads: merged.discordScanUseThreads,
          sessionWrappedEnabled: merged.sessionWrappedEnabled,
          ocrEnabled: merged.ocrEnabled,
          highAccuracyScans: merged.highAccuracyScans,
          foilDetectionEnabled: merged.foilDetectionEnabled,
          foilStarDetectionEnabled: merged.foilStarDetectionEnabled,
          correctionBinPrompt: merged.correctionBinPrompt,
          pauseScanningOnDeploy: merged.pauseScanningOnDeploy,
          leaderboardOptIn: merged.leaderboardOptIn,
          unmatchedCardsInGrid: merged.unmatchedCardsInGrid,
          correctionAutoCloseSeconds: merged.correctionAutoCloseSeconds,
          priceSource: merged.priceSource,
          conditionMultipliers: merged.conditionMultipliers,
          discordGuildId: existing?.discordGuildId ?? null,
          canManageOrgSettings: canManageOrgSettings(c.get("orgRole")),
        },
      };
    });
    if ("leaderboardOptIn" in body) forgetLeaderboardOptIns();
    forgetShopCatalogReadsForOrg(orgId);
    if (result.success && pricingChange.savedPricing) {
      void refreshOrgCardSnapshotsForPricing(c.get("jwtClaims"), orgId, pricingChange.savedPricing).catch(
        (error: unknown) => console.error("[org-settings] card snapshot refresh after pricing change:", error),
      );
    }
    return c.json(result);
  },
);
