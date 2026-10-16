import {
  SORTER_LINK_CLOSE_REVOKED,
  type SorterLinkCredentials,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { devices } from "../../db/schema";
import { getSorterLinkUrl } from "../../lib/constants/urls";
import { getDeviceByGuid } from "../../lib/devices";
import {
  closeDeviceLink,
  generateSorterLinkToken,
  getSorterLinkStatus,
  hashSorterLinkToken,
} from "../../lib/sorter-link";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const listSorterLinksRoute = new Hono<AppEnv>().get(
  "/sorter-links",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const rows = await authQuery(c.get("jwtClaims"), (tx) =>
        tx.query.devices.findMany({
          columns: { guid: true, sorterLinkTokenHash: true },
          where: (t, { and, eq }) =>
            and(eq(t.orgId, orgId), eq(t.isDeleted, false)),
        }),
      );
      return c.json({
        success: true,
        message: "Loaded sorter links.",
        data: rows.map((row) =>
          getSorterLinkStatus(row.guid!, row.sorterLinkTokenHash !== null),
        ),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

export const createSorterLinkRoute = new Hono<AppEnv>().post(
  "/:guid/sorter-link",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const token = generateSorterLinkToken();
    try {
      const found = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return false;
        await tx
          .update(devices)
          .set({
            sorterLinkTokenHash: hashSorterLinkToken(token),
            updatedAt: new Date(),
          })
          .where(eq(devices.id, device.id));
        return true;
      });
      if (!found) {
        return c.json({ success: false, message: "Device not found." }, 404);
      }
      closeDeviceLink(guid, SORTER_LINK_CLOSE_REVOKED);
      const data: SorterLinkCredentials = { token, url: getSorterLinkUrl() };
      return c.json({ success: true, message: "Created sorter link.", data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

export const deleteSorterLinkRoute = new Hono<AppEnv>().delete(
  "/:guid/sorter-link",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const found = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return false;
        await tx
          .update(devices)
          .set({ sorterLinkTokenHash: null, updatedAt: new Date() })
          .where(eq(devices.id, device.id));
        return true;
      });
      if (!found) {
        return c.json({ success: false, message: "Device not found." }, 404);
      }
      closeDeviceLink(guid, SORTER_LINK_CLOSE_REVOKED);
      return c.json({ success: true, message: "Removed sorter link." });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
