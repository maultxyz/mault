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
import { databaseErrorResponse } from "../../lib/database-error-response";

function toResponse(config = getPlanConfig()): AdminPlanConfigResponse {
  return {
    config,
    defaults: defaultPlanConfig(),
    billingEnabled: isBillingEnabled(),
  };
}

export const plansRoute = new Hono<AppEnv>()
  .get("/plans", requireAuth, requireRole("admin"), async (c) => {
    try {
      return c.json({
        success: true,
        data: toResponse(await refreshPlanConfig()),
      });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  })
  .put("/plans", requireAuth, requireRole("admin"), async (c) => {
    const config = parsePlanConfig(await c.req.json().catch(() => null));
    if (!config) {
      return c.json({ success: false, message: "Invalid plan settings." }, 400);
    }
    try {
      return c.json({
        success: true,
        data: toResponse(await savePlanConfig(config)),
      });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  });
