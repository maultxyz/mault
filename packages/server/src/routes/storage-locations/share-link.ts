import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  MONITOR_LINK_EXPIRY_DAYS,
  type StorageShareLink,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { storageLocations } from "../../db/schema";
import {
  allowsLongShareLinks,
  parseShareLinkPurpose,
  shareLinkExpiresInMinutes,
} from "../../lib/share-link-policy";
import { isShareTokenConfigured } from "../../lib/share-tokens";
import {
  isStorageAllowed,
  STORAGE_UPGRADE_MESSAGE,
} from "../../lib/storage-access";
import { forgetSharedStorageReads } from "../../lib/shared-storage-reads-cache";
import {
  forgetVerifiedStorageShareLinks,
  signStorageShareLink,
} from "../../lib/storage-share-links";
import type { ShareLinkRequestBody } from "../../lib/interfaces/share-tokens";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const storageShareLinkRoute = new Hono<AppEnv>()
  .post("/:guid/share-link", requireAuth, requireOrg, async (c) => {
    if (!isShareTokenConfigured()) {
      return c.json(
        { success: false, message: "Share links are not configured." },
        503,
      );
    }
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req
      .json<ShareLinkRequestBody>()
      .catch(() => ({}) as ShareLinkRequestBody);
    const expiresInDays =
      body.expiresInDays ?? DEFAULT_MONITOR_LINK_EXPIRY_DAYS;
    if (
      !(MONITOR_LINK_EXPIRY_DAYS as readonly number[]).includes(expiresInDays)
    ) {
      return c.json({ success: false, message: "Invalid expiry." }, 400);
    }
    if (body.showPrices !== undefined && typeof body.showPrices !== "boolean") {
      return c.json({ success: false, message: "Invalid price visibility." }, 400);
    }
    const showsPrices = body.showPrices ?? DEFAULT_SHARE_LINK_SHOWS_PRICES;
    const purpose = parseShareLinkPurpose(body.purpose);
    if (!purpose) {
      return c.json({ success: false, message: "Invalid link type." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      if (!(await isStorageAllowed(tx, orgId))) {
        return {
          success: false,
          message: STORAGE_UPGRADE_MESSAGE,
          upgradeRequired: true,
        };
      }
      const location = await tx.query.storageLocations.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { shareLinkVersion: true },
      });
      if (!location) {
        return { success: false, message: "Storage location not found." };
      }
      const allowsLongLinks = await allowsLongShareLinks(tx, orgId);
      const { token, expiresAt } = await signStorageShareLink(
        guid,
        orgId,
        location.shareLinkVersion,
        shareLinkExpiresInMinutes(purpose, allowsLongLinks, expiresInDays),
        showsPrices,
        purpose,
      );
      const data: StorageShareLink = {
        token,
        expiresAt: expiresAt.toISOString(),
      };
      return { success: true, message: "Created share link.", data };
    });
    return c.json(result);
  })
  .post("/:guid/share-link/revoke", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const updated = await authQuery(c.get("jwtClaims"), (tx) =>
      tx
        .update(storageLocations)
        .set({
          shareLinkVersion: sql`${storageLocations.shareLinkVersion} + 1`,
        })
        .where(
          and(
            eq(storageLocations.guid, guid),
            eq(storageLocations.orgId, orgId),
            eq(storageLocations.isDeleted, false),
          ),
        )
        .returning({ id: storageLocations.id }),
    );
    if (updated.length === 0) {
      return c.json({ success: false, message: "Storage location not found." });
    }
    forgetVerifiedStorageShareLinks(guid);
    forgetSharedStorageReads(guid);
    return c.json({ success: true, message: "Revoked share links." });
  });
