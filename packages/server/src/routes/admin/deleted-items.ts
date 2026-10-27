import {
  PLATFORM_STAFF_ROLES,
  DELETED_ITEM_TYPES,
  type DeletedItem,
  type DeletedItemType,
  type PagedList,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { db } from "../../db";
import type { DeletedItemRow } from "../../lib/interfaces/deleted-items";
import { parsePageParams } from "../../lib/paging";
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
    const params = parsePageParams(c);
    const typeParam = c.req.query("type") ?? "";
    const types = isDeletedItemType(typeParam) ? [typeParam] : DELETED_ITEM_TYPES;
    const search = (c.req.query("q") ?? "").trim().toLowerCase();
    const rows = (
      await Promise.all(types.map((type) => DELETED_ITEM_SOURCES[type].list()))
    )
      .flat()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const orgIdsOf = (items: DeletedItemRow[]) => [
      ...new Set(items.flatMap((r) => (r.orgId ? [r.orgId] : []))),
    ];
    const searchOrgNames = search
      ? await authProvider.getOrganisationNames(orgIdsOf(rows))
      : null;
    const matching = searchOrgNames
      ? rows.filter((r) =>
          [r.name, r.detail, r.orgId ? searchOrgNames.get(r.orgId) : null].some(
            (value) => value?.toLowerCase().includes(search),
          ),
        )
      : rows;
    const pageCount = Math.max(Math.ceil(matching.length / params.pageSize), 1);
    const page = Math.min(params.page ?? 1, pageCount);
    const pageRows = matching.slice(
      (page - 1) * params.pageSize,
      page * params.pageSize,
    );
    const orgNames =
      searchOrgNames ??
      (await authProvider.getOrganisationNames(orgIdsOf(pageRows)));
    const data: PagedList<DeletedItem> = {
      items: pageRows.map((r) => ({
        ...r,
        orgName: r.orgId ? (orgNames.get(r.orgId) ?? null) : null,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: matching.length,
      page,
      pageSize: params.pageSize,
    };
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
