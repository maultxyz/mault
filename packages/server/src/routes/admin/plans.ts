import type { AdminPlanConfigResponse } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  defaultPlanConfig,
  getPlanConfig,
  parsePlanConfig,
  refreshPlanConfig,
  savePlanConfig,
} from "../../lib/plan-config";
import {
  isLegacyPricingActive,
  saveLegacyPricingActive,
} from "../../lib/pricing-mode";
import {
  hasSeparateLegacyBusinessPrices,
  isBillingEnabled,
} from "../../lib/stripe";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function toResponse(config = getPlanConfig()): AdminPlanConfigResponse {
  return {
    config,
    defaults: defaultPlanConfig(),
    billingEnabled: isBillingEnabled(),
    isLegacyPricingActive: isLegacyPricingActive(),
  };
}

export const plansRoute = new Hono<AppEnv>()
  .get("/plans", requireAuth, requireRole("admin"), async (c) => {
    return c.json({
      success: true,
      data: toResponse(await refreshPlanConfig()),
    });
  })
  .put("/plans", requireAuth, requireRole("admin"), async (c) => {
    const config = parsePlanConfig(await c.req.json().catch(() => null));
    if (!config) {
      return c.json({ success: false, message: "Invalid plan settings." }, 400);
    }
    return c.json({
      success: true,
      data: toResponse(await savePlanConfig(config)),
    });
  })
  .put("/plans/pricing-mode", requireAuth, requireRole("admin"), async (c) => {
    const body = await c.req
      .json<{ isLegacyPricingActive?: unknown }>()
      .catch(() => ({ isLegacyPricingActive: undefined }));
    if (typeof body.isLegacyPricingActive !== "boolean") {
      return c.json({ success: false, message: "Invalid pricing mode." }, 400);
    }
    if (
      !body.isLegacyPricingActive &&
      isBillingEnabled() &&
      !hasSeparateLegacyBusinessPrices()
    ) {
      return c.json({
        success: false,
        message:
          "Set STRIPE_PRICE_ID_LEGACY_BUSINESS to the old Business price and STRIPE_PRICE_ID_BUSINESS to the new one before switching.",
      });
    }
    await saveLegacyPricingActive(body.isLegacyPricingActive);
    return c.json({ success: true, data: toResponse() });
  });
