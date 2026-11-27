import type { NodeWebSocket } from "@hono/node-ws";
import { PI_HOST_CAMERA_SEGMENT } from "@magic-vault/shared";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { authProvider } from "../../auth";
import { authQuery } from "../../db";
import { UUID_PATTERN } from "../../lib/constants/validation";
import type { PiHostCameraEnv } from "../../lib/interfaces/pi-hosts";
import { findPiHostActiveScanUser } from "../../lib/pi-hosts";
import { attachPiCameraViewer, detachPiCameraViewer } from "../../lib/pi-link-relay";
import { verifyHardwareClientToken } from "../../middleware/auth";

const requirePiHostCameraViewer = createMiddleware<PiHostCameraEnv>(async (c, next) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");
  const hostGuid = c.req.param("guid") ?? "";
  if (!token || !orgId) return c.body(null, 401);
  if (!UUID_PATTERN.test(hostGuid)) return c.body(null, 404);
  const payload = await verifyHardwareClientToken(token);
  if (!payload?.sub) return c.body(null, 401);
  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  if (!member) return c.body(null, 403);
  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated", org_id: orgId });
  const host = await authQuery(jwtClaims, (tx) => findPiHostActiveScanUser(tx, orgId, hostGuid));
  if (!host) return c.body(null, 404);
  c.set("piHostGuid", hostGuid);
  await next();
});

export function createPiHostCameraRouter(upgradeWebSocket: NodeWebSocket["upgradeWebSocket"]) {
  return new Hono<PiHostCameraEnv>().get(
    `/:guid${PI_HOST_CAMERA_SEGMENT}`,
    requirePiHostCameraViewer,
    upgradeWebSocket((c) => {
      const hostGuid = c.get("piHostGuid");
      return {
        onOpen: (_event, viewer) => attachPiCameraViewer(hostGuid, viewer),
        onClose: (_event, viewer) => detachPiCameraViewer(hostGuid, viewer),
      };
    }),
  );
}
