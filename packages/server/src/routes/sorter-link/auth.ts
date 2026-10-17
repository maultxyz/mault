import { createMiddleware } from "hono/factory";
import { authProvider } from "../../auth";
import { authQuery, db } from "../../db";
import {
  SORTER_FIRMWARE_HEADER,
  SORTER_ID_HEADER,
} from "../../lib/constants/sorter-link";
import { getDeviceByGuid } from "../../lib/devices";
import type { SorterLinkEnv } from "../../lib/interfaces/sorter-link";
import { hashSorterLinkToken } from "../../lib/sorter-link";
import { verifyRequestToken } from "../../middleware/auth";

export const requireSorterToken = createMiddleware<SorterLinkEnv>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) return c.body(null, 401);
    const tokenHash = hashSorterLinkToken(header.slice(7).trim());
    const device = await db.query.devices.findFirst({
      columns: { guid: true, orgId: true, hardwareId: true },
      where: (t, { and, eq }) =>
        and(eq(t.sorterLinkTokenHash, tokenHash), eq(t.isDeleted, false)),
    });
    if (!device?.guid) return c.body(null, 401);
    const sorterId = c.req.header(SORTER_ID_HEADER)?.trim().toUpperCase();
    if (
      device.hardwareId &&
      sorterId &&
      sorterId !== device.hardwareId.toUpperCase()
    ) {
      return c.body(null, 403);
    }
    c.set("sorterLink", {
      orgId: device.orgId,
      deviceGuid: device.guid,
      firmwareVersion:
        c.req.header(SORTER_FIRMWARE_HEADER)?.trim().slice(0, 32) || null,
    });
    await next();
  },
);

export const requireSorterClient = createMiddleware<SorterLinkEnv>(
  async (c, next) => {
    const token = c.req.query("token");
    const orgId = c.req.query("orgId");
    const deviceGuid = c.req.query("device");
    if (!token || !orgId || !deviceGuid) return c.body(null, 401);
    const payload = await verifyRequestToken(token);
    if (!payload?.sub) return c.body(null, 401);
    const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
    if (!member) return c.body(null, 403);
    const jwtClaims = JSON.stringify({
      sub: payload.sub,
      role: "authenticated",
      org_id: orgId,
    });
    const device = await authQuery(jwtClaims, (tx) =>
      getDeviceByGuid(tx, orgId, deviceGuid),
    ).catch(() => null);
    if (!device) return c.body(null, 404);
    c.set("sorterLink", { orgId, deviceGuid, firmwareVersion: null });
    await next();
  },
);
