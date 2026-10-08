import { cardWithStoredPricesSql } from "../../lib/card-price-sql";
import {
  STORAGE_SEARCH_QUERY_MAX_LENGTH,
  STORAGE_SEARCH_RESULT_LIMIT,
  type PlayingCardWithDistance,
  type StorageLocationCard,
  type StorageLocationSearchResult,
} from "@magic-vault/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  collectionCards,
  collections,
  storageLocations,
} from "../../db/schema";
import {
  isStorageAllowed,
  STORAGE_UPGRADE_MESSAGE,
} from "../../lib/storage-access";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadLocations, locationNameTaken, parseLocationName } from "./shared";

const router = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    try {
      const data = await authQuery(c.get("jwtClaims"), (tx) =>
        loadLocations(tx, orgId),
      );
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .get("/search", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const query = (c.req.query("q") ?? "")
      .trim()
      .slice(0, STORAGE_SEARCH_QUERY_MAX_LENGTH)
      .toLowerCase();
    if (!query) return c.json({ success: true, data: [] });
    try {
      const rows = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .select({
            scanId: collectionCards.guid,
            position: collectionCards.locationPosition,
            card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
            isFoil: collectionCards.isFoil,
            foilType: collectionCards.foilType,
            needsReview: sql<boolean>`(${collectionCards.needsReview} OR (${collectionCards.alternativeMatches} IS NOT NULL AND ${collectionCards.alternativeMatches} <> '[]'::jsonb))`,
            corrected: collectionCards.isCorrected,
            collectionGuid: collections.guid,
            collectionName: collections.name,
            locationGuid: storageLocations.guid,
            locationName: storageLocations.name,
          })
          .from(collectionCards)
          .innerJoin(
            storageLocations,
            eq(storageLocations.id, collectionCards.locationId),
          )
          .innerJoin(
            collections,
            eq(collections.id, collectionCards.collectionId),
          )
          .where(
            and(
              eq(storageLocations.orgId, orgId),
              eq(storageLocations.isDeleted, false),
              eq(collections.isDeleted, false),
              sql`strpos(lower(${collectionCards.card} ->> 'name'), ${query}) > 0`,
            ),
          )
          .orderBy(
            sql`${collectionCards.card} ->> 'name'`,
            asc(storageLocations.name),
            asc(collectionCards.locationPosition),
          )
          .limit(STORAGE_SEARCH_RESULT_LIMIT),
      );
      const data: StorageLocationSearchResult[] = rows.map((r) => ({
        scanId: r.scanId!,
        position: r.position ?? 0,
        card: r.card,
        isFoil: r.isFoil,
        foilType: r.foilType,
        needsReview: r.needsReview,
        corrected: r.corrected,
        collectionGuid: r.collectionGuid!,
        collectionName: r.collectionName,
        locationGuid: r.locationGuid!,
        locationName: r.locationName,
      }));
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .post("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{ name?: unknown }>().catch(() => ({}));
    const name = parseLocationName((body as { name?: unknown }).name);
    if (!name) {
      return c.json({ success: false, message: "Invalid name." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        if (!(await isStorageAllowed(tx, orgId))) {
          return {
            success: false,
            message: STORAGE_UPGRADE_MESSAGE,
            upgradeRequired: true,
          };
        }
        if (await locationNameTaken(tx, orgId, name)) {
          return { success: false, message: "That name is already used." };
        }
        const [created] = await tx
          .insert(storageLocations)
          .values({ name, orgId })
          .returning({ guid: storageLocations.guid });
        return {
          success: true,
          data: {
            guid: created.guid!,
            locations: await loadLocations(tx, orgId),
          },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .put("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req.json<{ name?: unknown }>().catch(() => ({}));
    const name = parseLocationName((body as { name?: unknown }).name);
    if (!name) {
      return c.json({ success: false, message: "Invalid name." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        if (await locationNameTaken(tx, orgId, name, guid)) {
          return { success: false, message: "That name is already used." };
        }
        const updated = await tx
          .update(storageLocations)
          .set({ name, updatedAt: new Date() })
          .where(
            and(
              eq(storageLocations.guid, guid),
              eq(storageLocations.orgId, orgId),
              eq(storageLocations.isDeleted, false),
            ),
          )
          .returning({ id: storageLocations.id });
        if (updated.length === 0) {
          return { success: false, message: "Storage location not found." };
        }
        return { success: true, data: await loadLocations(tx, orgId) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .delete("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const location = await tx.query.storageLocations.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true },
        });
        if (!location) {
          return { success: false, message: "Storage location not found." };
        }
        await tx
          .update(storageLocations)
          .set({ isDeleted: true })
          .where(eq(storageLocations.id, location.id));
        return { success: true, data: await loadLocations(tx, orgId) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .get("/:guid/cards", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const location = await tx.query.storageLocations.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true },
        });
        if (!location) {
          return { success: false, message: "Storage location not found." };
        }
        const rows = await tx
          .select({
            scanId: collectionCards.guid,
            position: collectionCards.locationPosition,
            card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
            isFoil: collectionCards.isFoil,
            foilType: collectionCards.foilType,
            needsReview: sql<boolean>`(${collectionCards.needsReview} OR (${collectionCards.alternativeMatches} IS NOT NULL AND ${collectionCards.alternativeMatches} <> '[]'::jsonb))`,
            corrected: collectionCards.isCorrected,
            collectionGuid: collections.guid,
            collectionName: collections.name,
          })
          .from(collectionCards)
          .innerJoin(
            collections,
            eq(collections.id, collectionCards.collectionId),
          )
          .where(
            and(
              eq(collectionCards.locationId, location.id),
              eq(collections.isDeleted, false),
            ),
          )
          .orderBy(asc(collectionCards.locationPosition));
        const data: StorageLocationCard[] = rows.map((r) => ({
          scanId: r.scanId!,
          position: r.position ?? 0,
          card: r.card,
          isFoil: r.isFoil,
          foilType: r.foilType,
          needsReview: r.needsReview,
          corrected: r.corrected,
          collectionGuid: r.collectionGuid!,
          collectionName: r.collectionName,
        }));
        return { success: true, data };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .delete("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const scanId = c.req.param("scanId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const location = await tx.query.storageLocations.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true },
        });
        if (!location) {
          return { success: false, message: "Storage location not found." };
        }
        const updated = await tx
          .update(collectionCards)
          .set({ locationId: null, locationPosition: null })
          .where(
            and(
              eq(collectionCards.guid, scanId),
              eq(collectionCards.orgId, orgId),
              eq(collectionCards.locationId, location.id),
            ),
          )
          .returning({ id: collectionCards.id });
        if (updated.length === 0) {
          return {
            success: false,
            message: "Card not found in this location.",
          };
        }
        return { success: true, data: await loadLocations(tx, orgId) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });

export { router as storageLocationsRouter };
