import {
  SHOP_PHOTO_MAX_UPLOAD_BYTES,
  SHOP_PHOTO_MIME_TYPES,
  SHOP_PHOTO_UPLOAD_FIELD,
  shopCatalogFormSchema,
  type ShopCatalog,
  type ShopCatalogInput,
  type ShopPhoto,
} from "@magic-vault/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import {
  collections,
  orgSettings,
  shopCatalogs,
  storageLocations,
} from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
  SHOP_CATALOG_INVALID_MESSAGE,
  SHOP_CATALOG_NOT_FOUND_MESSAGE,
  SHOP_CATALOG_SOURCES_INVALID_MESSAGE,
  SHOP_PHOTO_MISSING_MESSAGE,
  SHOP_PHOTO_TOO_LARGE_MESSAGE,
  SHOP_PHOTO_TYPE_MESSAGE,
  SHOP_PHOTO_UNREADABLE_MESSAGE,
} from "../../lib/constants/business";
import { deleteObjects } from "../../lib/object-storage";
import {
  loadShopPhotoRow,
  normalizeShopPhoto,
  resolveShopPhotoUrl,
  storeShopPhoto,
} from "../../lib/shop-photo";
import {
  forgetShopCatalogLinks,
  forgetShopCatalogReadsForOrg,
  loadShopCatalogSources,
  shopCatalogLinkToken,
  toShopCatalogSources,
} from "../../lib/shop-catalogs";
import { uuidArraySql } from "../../lib/sql-arrays";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { businessQuery, notFound, readJson } from "./shared";

type ShopCatalogRow = typeof shopCatalogs.$inferSelect;

async function toShopCatalog(
  tx: Transaction,
  row: ShopCatalogRow,
): Promise<ShopCatalog> {
  const sources = await loadShopCatalogSources(
    tx,
    row.orgId,
    row.collectionIds,
    row.storageLocationIds,
  );
  return {
    guid: row.guid,
    name: row.name,
    showsPrices: row.showsPrices,
    collections: toShopCatalogSources(sources.collections),
    storageLocations: toShopCatalogSources(sources.storageLocations),
    linkToken: await shopCatalogLinkToken(
      row.guid,
      row.orgId,
      row.shareLinkVersion,
    ),
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveSourceIds(
  tx: Transaction,
  orgId: string,
  input: ShopCatalogInput,
): Promise<{ collectionIds: number[]; storageLocationIds: number[] } | null> {
  const collectionGuids = [...new Set(input.collectionGuids)];
  const storageLocationGuids = [...new Set(input.storageLocationGuids)];
  const collectionRows =
    collectionGuids.length === 0
      ? []
      : await tx
          .select({ id: collections.id })
          .from(collections)
          .where(
            and(
              eq(collections.orgId, orgId),
              eq(collections.isDeleted, false),
              sql`${collections.guid} = ANY(${uuidArraySql(collectionGuids)})`,
            ),
          );
  const locationRows =
    storageLocationGuids.length === 0
      ? []
      : await tx
          .select({ id: storageLocations.id })
          .from(storageLocations)
          .where(
            and(
              eq(storageLocations.orgId, orgId),
              eq(storageLocations.isDeleted, false),
              sql`${storageLocations.guid} = ANY(${uuidArraySql(storageLocationGuids)})`,
            ),
          );
  if (
    collectionRows.length !== collectionGuids.length ||
    locationRows.length !== storageLocationGuids.length
  ) {
    return null;
  }
  return {
    collectionIds: collectionRows.map((row) => row.id),
    storageLocationIds: locationRows.map((row) => row.id),
  };
}

function findShopCatalog(tx: Transaction, orgId: string, guid: string) {
  return tx.query.shopCatalogs.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
  });
}

async function saveShopPhotoRow(
  tx: Transaction,
  orgId: string,
  values: { shopPhotoKey: string | null; shopPhotoDataUrl: string | null },
): Promise<string | null> {
  const previous = await loadShopPhotoRow(tx, orgId);
  await tx
    .insert(orgSettings)
    .values({ orgId, ...values })
    .onConflictDoUpdate({
      target: [orgSettings.orgId],
      set: { ...values, updatedAt: new Date() },
    });
  return previous?.shopPhotoKey ?? null;
}

export const shopCatalogsRoute = new Hono<AppEnv>()
  .get("/shop-photo", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const data: ShopPhoto = {
        url: await resolveShopPhotoUrl(await loadShopPhotoRow(tx, c.get("orgId"))),
      };
      return { success: true, data };
    }),
  )
  .post("/shop-photo", requireAuth, requireOrg, async (c) => {
    const body = await c.req.parseBody();
    const file = body[SHOP_PHOTO_UPLOAD_FIELD];
    if (!(file instanceof File)) {
      return c.json({ success: false, message: SHOP_PHOTO_MISSING_MESSAGE });
    }
    if (!SHOP_PHOTO_MIME_TYPES.includes(file.type)) {
      return c.json({ success: false, message: SHOP_PHOTO_TYPE_MESSAGE });
    }
    if (file.size > SHOP_PHOTO_MAX_UPLOAD_BYTES) {
      return c.json({ success: false, message: SHOP_PHOTO_TOO_LARGE_MESSAGE });
    }
    let photo: Buffer;
    try {
      photo = await normalizeShopPhoto(Buffer.from(await file.arrayBuffer()));
    } catch {
      return c.json({ success: false, message: SHOP_PHOTO_UNREADABLE_MESSAGE });
    }
    const orgId = c.get("orgId");
    let storedKey: string | null = null;
    const result = await businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const stored = await storeShopPhoto(orgId, photo);
      storedKey = stored.shopPhotoKey;
      const previousKey = await saveShopPhotoRow(tx, orgId, stored);
      if (previousKey) deleteObjects([previousKey]);
      const data: ShopPhoto = { url: await resolveShopPhotoUrl(stored) };
      return { success: true, data };
    });
    if (result.status !== 200 && storedKey) deleteObjects([storedKey]);
    forgetShopCatalogReadsForOrg(orgId);
    return result;
  })
  .delete("/shop-photo", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const result = await businessQuery(c, async (tx, access) => {
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const previousKey = await saveShopPhotoRow(tx, orgId, {
        shopPhotoKey: null,
        shopPhotoDataUrl: null,
      });
      if (previousKey) deleteObjects([previousKey]);
      const data: ShopPhoto = { url: null };
      return { success: true, data };
    });
    forgetShopCatalogReadsForOrg(orgId);
    return result;
  })
  .get("/shop-catalogs", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const rows = await tx
        .select()
        .from(shopCatalogs)
        .where(
          and(
            eq(shopCatalogs.orgId, c.get("orgId")),
            eq(shopCatalogs.isDeleted, false),
          ),
        )
        .orderBy(asc(shopCatalogs.name), asc(shopCatalogs.id));
      const data: ShopCatalog[] = [];
      for (const row of rows) data.push(await toShopCatalog(tx, row));
      return { success: true, data };
    }),
  )
  .post("/shop-catalogs", requireAuth, requireOrg, async (c) => {
    const input = shopCatalogFormSchema.safeParse(await readJson(c));
    if (!input.success) {
      return c.json({ success: false, message: SHOP_CATALOG_INVALID_MESSAGE }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const sourceIds = await resolveSourceIds(tx, orgId, input.data);
      if (!sourceIds) {
        return { success: false, message: SHOP_CATALOG_SOURCES_INVALID_MESSAGE };
      }
      const [created] = await tx
        .insert(shopCatalogs)
        .values({
          orgId,
          name: input.data.name,
          showsPrices: input.data.showsPrices,
          ...sourceIds,
        })
        .returning();
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "catalog.created",
        summary: created.name,
        details: { catalogGuid: created.guid },
      });
      return { success: true, data: await toShopCatalog(tx, created) };
    });
  })
  .put("/shop-catalogs/:guid", requireAuth, requireOrg, async (c) => {
    const input = shopCatalogFormSchema.safeParse(await readJson(c));
    if (!input.success) {
      return c.json({ success: false, message: SHOP_CATALOG_INVALID_MESSAGE }, 400);
    }
    const guid = c.req.param("guid");
    const result = await businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const existing = await findShopCatalog(tx, orgId, guid);
      if (!existing) return notFound(SHOP_CATALOG_NOT_FOUND_MESSAGE);
      const sourceIds = await resolveSourceIds(tx, orgId, input.data);
      if (!sourceIds) {
        return { success: false, message: SHOP_CATALOG_SOURCES_INVALID_MESSAGE };
      }
      const [updated] = await tx
        .update(shopCatalogs)
        .set({
          name: input.data.name,
          showsPrices: input.data.showsPrices,
          ...sourceIds,
          updatedAt: new Date(),
        })
        .where(eq(shopCatalogs.id, existing.id))
        .returning();
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "catalog.updated",
        summary: updated.name,
        details: { catalogGuid: updated.guid },
      });
      return { success: true, data: await toShopCatalog(tx, updated) };
    });
    forgetShopCatalogLinks(guid);
    return result;
  })
  .post("/shop-catalogs/:guid/reset-link", requireAuth, requireOrg, async (c) => {
    const guid = c.req.param("guid");
    const result = await businessQuery(c, async (tx, access) => {
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const existing = await findShopCatalog(tx, orgId, guid);
      if (!existing) return notFound(SHOP_CATALOG_NOT_FOUND_MESSAGE);
      const [updated] = await tx
        .update(shopCatalogs)
        .set({
          shareLinkVersion: sql`${shopCatalogs.shareLinkVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(shopCatalogs.id, existing.id))
        .returning();
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "catalog.updated",
        summary: updated.name,
        details: { catalogGuid: updated.guid, linkReset: true },
      });
      return { success: true, data: await toShopCatalog(tx, updated) };
    });
    forgetShopCatalogLinks(guid);
    return result;
  })
  .delete("/shop-catalogs/:guid", requireAuth, requireOrg, async (c) => {
    const guid = c.req.param("guid");
    const result = await businessQuery(c, async (tx, access) => {
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const existing = await findShopCatalog(tx, orgId, guid);
      if (!existing) return notFound(SHOP_CATALOG_NOT_FOUND_MESSAGE);
      await tx
        .update(shopCatalogs)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(shopCatalogs.id, existing.id));
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "catalog.deleted",
        summary: existing.name,
        details: { catalogGuid: existing.guid },
      });
      return { success: true, data: null };
    });
    forgetShopCatalogLinks(guid);
    return result;
  });
