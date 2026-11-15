import type { NodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { authProvider } from "../auth";
import { isPiHost, isPiSorter } from "../lib/pi-host";
import { openPiSerialSocket } from "../lib/pi-serial-bridge";
import { verifyHardwareClientToken } from "../middleware/auth";
import { bluetoothCapabilities, discoverBluetoothSorters } from "../lib/pi-bluetooth";
import { bluetoothSorterBusy, listPiSorters } from "../lib/pi-serial-port";
import { requireAuth, requireOrg, rejectWhileImpersonating, type AppEnv } from "../middleware/auth";
import { piUpdateRunning } from "../lib/pi-update";

export function createPiSerialRouter(
  upgradeWebSocket: NodeWebSocket["upgradeWebSocket"],
) {
  return createPiHardwareRouter(upgradeWebSocket, false);
}

export function createPiSorterRouter(
  upgradeWebSocket: NodeWebSocket["upgradeWebSocket"],
) {
  return createPiHardwareRouter(upgradeWebSocket, true);
}

function createPiHardwareRouter(
  upgradeWebSocket: NodeWebSocket["upgradeWebSocket"],
  builtin: boolean,
) {
  return new Hono<AppEnv>().get("/bluetooth", requireAuth, requireOrg, rejectWhileImpersonating, async (c) => {
    if (!isPiHost() || isPiSorter()) return c.notFound();
    return c.json(await bluetoothCapabilities());
  }).post("/bluetooth/devices", requireAuth, requireOrg, rejectWhileImpersonating, async (c) => {
    if (!isPiHost() || isPiSorter()) return c.notFound();
    if (!(await bluetoothCapabilities()).powered) return c.json({ devices: [] }, 503);
    const devices = await discoverBluetoothSorters();
    return c.json({ devices: devices.map((device) => ({ ...device, busy: bluetoothSorterBusy(device.id) })) });
  }).get("/devices", requireAuth, requireOrg, rejectWhileImpersonating, async (c) => {
    if (!isPiHost()) return c.notFound();
    return c.json({ devices: await listPiSorters() });
  }).get(
    "/",
    async (c, next) => {
      if (!isPiHost() || builtin !== isPiSorter()) return c.notFound();
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
    upgradeWebSocket((c) => ({
      onOpen(_event, ws) {
        if (ws.raw) openPiSerialSocket(ws.raw, builtin ? "gpio" : c.req.query("controllerId") ?? "usb");
      },
    })),
  );
}
