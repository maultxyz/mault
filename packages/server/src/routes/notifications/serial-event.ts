import type { SerialEventReport } from "@magic-vault/shared";
import { Hono } from "hono";
import { sendDiscordNotification } from "../../lib/discord";
import { classifySerialEvent } from "../../lib/serial-events";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const serialEventNotificationRoute = new Hono<AppEnv>().post(
  "/serial-event",
  requireAuth,
  requireOrg,
  async (c) => {
    const event = await c.req.json<SerialEventReport>();
    const classified = classifySerialEvent(event);
    if (classified) {
      const orgId = c.get("orgId");
      void sendDiscordNotification(
        orgId,
        {
          title: `Magic Vault — ${classified.title}`,
          description: classified.description,
          color: 0xed4245,
          timestamp: new Date().toISOString(),
        },
        "error",
        undefined,
        undefined,
        event.collectionGuid,
      );
    }
    return c.json({ success: true, message: "Serial event reported." });
  },
);
