import type { SerialEventReport } from "@magic-vault/shared";
import { Hono } from "hono";
import { raiseDeviceAlert } from "../../lib/device-alerts";
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
      void raiseDeviceAlert({
        orgId: c.get("orgId"),
        deviceGuid:
          typeof event.deviceGuid === "string" ? event.deviceGuid : null,
        type: classified.type,
        title: classified.title,
        description: classified.description,
        collectionGuid: event.collectionGuid,
      });
    }
    return c.json({ success: true, message: "Serial event reported." });
  },
);
