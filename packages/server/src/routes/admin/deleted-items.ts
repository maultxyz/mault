import {
  PLATFORM_STAFF_ROLES,
  DELETED_ITEM_TYPES,
  type DeletedItem,
  type DeletedItemType,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { invalidatePublicAnnouncements } from "../../lib/public-announcements";
import { publicGamesCache } from "../../lib/public-games";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { DELETED_ITEM_SOURCES } from "./deleted-items-sources";

function isDeletedItemType(value: string): value is DeletedItemType {
  return (DELETED_ITEM_TYPES as readonly string[]).includes(value);
}

export const deletedItemsRoute = new Hono<AppEnv>()
  .get("/deleted", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const rows = (
      await Promise.all(
        DELETED_ITEM_TYPES.map((type) => DELETED_ITEM_SOURCES[type].list()),
      )
    ).flat();
    const orgIds = [
      ...new Set(rows.flatMap((r) => (r.orgId ? [r.orgId] : []))),
    ];
    const orgNames = new Map(
      await Promise.all(
        orgIds.map(
          async (orgId) =>
            [orgId, await authProvider.getOrganisationName(orgId)] as const,
        ),
      ),
    );
    const data: DeletedItem[] = rows
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((r) => ({
        ...r,
        orgName: r.orgId ? (orgNames.get(r.orgId) ?? null) : null,
        updatedAt: r.updatedAt.toISOString(),
      }));
    return c.json({ success: true, data });
  })
  .post(
    "/deleted/:type/:guid/restore",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const type = c.req.param("type");
      if (!isDeletedItemType(type)) {
        return c.json({ success: false, message: "Unknown item type." }, 400);
      }
      const result = await db.transaction((tx) =>
        DELETED_ITEM_SOURCES[type].restore(tx, c.req.param("guid")),
      );
      if (!result.success) return c.json(result);
      if (type === "announcement") invalidatePublicAnnouncements();
      if (type === "game") publicGamesCache.invalidate();
      if (result.orgId && type === "collection") {
        emitToOrg(result.orgId, "collections_changed", {
          guid: c.req.param("guid"),
        });
      }
      return c.json({ success: true, data: null });
    },
  );
