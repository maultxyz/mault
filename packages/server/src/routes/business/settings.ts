import {
  toBusinessPermissions,
  toBuylistConfig,
  type BusinessSettings,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { orgSettings } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { loadBusinessSettings } from "../../lib/business-access";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { businessQuery, readJson } from "./shared";
import { BUSINESS_FORBIDDEN_RESULT } from "../../lib/constants/business";

export const businessSettingsRoute = new Hono<AppEnv>()
  .get("/settings", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => ({
      success: true,
      data: {
        settings: await loadBusinessSettings(tx, c.get("orgId")),
        access,
      },
    })),
  )
  .put("/settings", requireAuth, requireOrg, async (c) => {
    const body = await readJson<BusinessSettings>(c);
    const buylist = toBuylistConfig(body.buylist);
    const permissions = toBusinessPermissions(body.permissions);
    return businessQuery(c, async (tx, access) => {
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const values = {
        buylistConfig: buylist,
        businessPermissions: permissions,
        updatedAt: new Date(),
      };
      await tx
        .insert(orgSettings)
        .values({ orgId, ...values })
        .onConflictDoUpdate({ target: [orgSettings.orgId], set: values });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "business.settings",
      });
      return { success: true, data: { buylist, permissions } };
    });
  });
