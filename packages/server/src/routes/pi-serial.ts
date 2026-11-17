import type { NodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { authProvider } from "../auth";
import { isPiHost } from "../lib/pi-host";
import { openPiSerialSocket } from "../lib/pi-serial-bridge";
import { verifyHardwareClientToken } from "../middleware/auth";
import { piUpdateRunning } from "../lib/pi-update";

export function createPiSerialRouter(
  upgradeWebSocket: NodeWebSocket["upgradeWebSocket"],
) {
  return new Hono().get(
    "/",
    async (c, next) => {
      if (!isPiHost()) return c.notFound();
      const token = c.req.query("token");
      const orgId = c.req.query("orgId");
      if (!token || !orgId) return c.text("Unauthorized", 401);
      const payload = await verifyHardwareClientToken(token);
      if (!payload?.sub) return c.text("Unauthorized", 401);
      const member = await authProvider.resolveOrgMembership(
        payload.sub,
        orgId,
      );
      if (!member) return c.text("Unauthorized", 401);
      if (await piUpdateRunning())
        return c.text("A system update is running.", 409);
      await next();
    },
    upgradeWebSocket(() => ({
      onOpen(_event, ws) {
        if (ws.raw) openPiSerialSocket(ws.raw);
      },
    })),
  );
}
