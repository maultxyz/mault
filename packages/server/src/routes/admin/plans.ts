import type { AdminPlanConfigResponse } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  defaultPlanConfig,
  getPlanConfig,
  parsePlanConfig,
  refreshPlanConfig,
  savePlanConfig,
} from "../../lib/plan-config";
import { isBillingEnabled } from "../../lib/stripe";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function toResponse(config = getPlanConfig()): AdminPlanConfigResponse {
  return {
    config,
    defaults: defaultPlanConfig(),
    billingEnabled: isBillingEnabled(),
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
  });
