import { statusMessageSettingsUpdateSchema } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  loadStatusMessageSettings,
  updateStatusMessageSettings,
} from "../../lib/customer-status-messages";
import {
  STATUS_MESSAGE_SETTINGS_IMPERSONATING_MESSAGE,
  STATUS_MESSAGE_SETTINGS_INVALID_MESSAGE,
} from "../../lib/constants/status-messages";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const meStatusMessagesRoute = new Hono<AppEnv>()
  .get("/status-messages", requireAuth, async (c) => {
    const data = await loadStatusMessageSettings(c.get("userId"));
    return c.json({ success: true, data });
  })
  .put("/status-messages", requireAuth, async (c) => {
    const parsed = statusMessageSettingsUpdateSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ success: false, message: STATUS_MESSAGE_SETTINGS_INVALID_MESSAGE }, 400);
    }
    if (c.get("impersonatedBy")) {
      return c.json(
        { success: false, message: STATUS_MESSAGE_SETTINGS_IMPERSONATING_MESSAGE },
        400,
      );
    }
    await updateStatusMessageSettings(c.get("userId"), parsed.data);
    const data = await loadStatusMessageSettings(c.get("userId"));
    return c.json({ success: true, data });
  });
