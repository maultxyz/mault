import { cardWithStoredPricesSql } from "../../lib/card-price-sql";
import {
  STORAGE_CARDS_PAGE_SIZE,
  STORAGE_CARDS_PAGE_SIZE_MAX,
  STORAGE_MOVE_CARDS_MAX,
  STORAGE_SEARCH_QUERY_MAX_LENGTH,
  STORAGE_SEARCH_RESULT_LIMIT,
  toCardCondition,
  type PagedList,
  type PlayingCardWithDistance,
  type StorageLocation,
  type StorageLocationCard,
  type StorageLocationCardContext,
  type StorageLocationCardPage,
  type StorageLocationExportCard,
  type StorageLocationSearchResult,
} from "@magic-vault/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  collectionCards,
  collections,
  games,
  storageLocations,
} from "../../db/schema";
import {
  isStorageAllowed,
  STORAGE_UPGRADE_MESSAGE,
} from "../../lib/storage-access";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { parsePageParams, resolvePageWindow } from "../../lib/paging";
import {
  moveCardsToLocation,
  moveCollectionToLocation,
} from "../../lib/storage-locations";
import { emitCardsStoredWebhook } from "../../lib/webhooks/events";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  countStoredCards,
  findLocationId,
  findStoredCardNeighbor,
  loadLocations,
  locationNameTaken,
  orderedLocationGuids,
  parseLocationName,
  selectStoredCards,
  storedCardOrderKey,
  storedCardPosition,
  storedCardsWhere,
  toStoredCard,
} from "./shared";

const router = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      loadLocations(tx, orgId),
    );
    return c.json({ success: true, data });
  })
  .get("/page", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const params = parsePageParams(c);
    const data = await authQuery(
      c.get("jwtClaims"),
      async (tx): Promise<PagedList<StorageLocation>> => {
        const window = resolvePageWindow(
          params,
          await orderedLocationGuids(tx, orgId),
        );
        return {
          items: await loadLocations(tx, orgId, window.guids),
          total: window.total,
          page: window.page,
          pageSize: window.pageSize,
        };
      },
    );
    return c.json({ success: true, data });
  })
  .get("/search", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const query = (c.req.query("q") ?? "")
      .trim()
      .slice(0, STORAGE_SEARCH_QUERY_MAX_LENGTH)
      .toLowerCase();
    if (!query) return c.json({ success: true, data: [] });
    const rows = await authQuery(c.get("jwtClaims"), (tx) =>
      tx
        .select({
          scanId: collectionCards.guid,
          position: collectionCards.locationPosition,
          card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
          isFoil: collectionCards.isFoil,
          foilType: collectionCards.foilType,
          condition: collectionCards.condition,
          language: collectionCards.language,
          lowConfidenceMatch: collectionCards.lowConfidenceMatch,
          hasAlternatives: sql<boolean>`(${collectionCards.alternativeMatches} IS NOT NULL AND ${collectionCards.alternativeMatches} <> '[]'::jsonb)`,
          corrected: collectionCards.isCorrected,
          reviewed: collectionCards.isReviewed,
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
      condition: toCardCondition(r.condition),
      language: r.language,
      lowConfidenceMatch: r.lowConfidenceMatch,
      hasAlternatives: r.hasAlternatives,
      corrected: r.corrected,
      reviewed: r.reviewed,
      collectionGuid: r.collectionGuid!,
      collectionName: r.collectionName,
      locationGuid: r.locationGuid!,
      locationName: r.locationName,
    }));
    return c.json({ success: true, data });
  })
  .get("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    if (!UUID_PATTERN.test(guid)) {
      return c.json({ success: false, message: "Invalid location." }, 400);
    }
    const [data] = await authQuery(c.get("jwtClaims"), (tx) =>
      loadLocations(tx, orgId, [guid]),
    );
    if (!data) {
      return c.json({ success: false, message: "Storage location not found." });
    }
    return c.json({ success: true, data });
  })
  .post("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{ name?: unknown }>().catch(() => ({}));
    const name = parseLocationName((body as { name?: unknown }).name);
    if (!name) {
      return c.json({ success: false, message: "Invalid name." }, 400);
    }
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
  })
  .put("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req.json<{ name?: unknown }>().catch(() => ({}));
    const name = parseLocationName((body as { name?: unknown }).name);
    if (!name) {
      return c.json({ success: false, message: "Invalid name." }, 400);
    }
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
  })
  .delete("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
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
  })
  .get("/:guid/cards", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const rows = await selectStoredCards(tx)
        .where(storedCardsWhere(locationId))
        .orderBy(asc(storedCardPosition), asc(collectionCards.id));
      const data: StorageLocationCard[] = rows.map(toStoredCard);
      return { success: true, data };
    });
    return c.json(result);
  })
  .get("/:guid/cards/page", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const pageSize = Math.min(
      Math.max(
        Number.parseInt(c.req.query("limit") ?? "", 10) ||
          STORAGE_CARDS_PAGE_SIZE,
        1,
      ),
      STORAGE_CARDS_PAGE_SIZE_MAX,
    );
    const requestedPage = Math.max(
      Number.parseInt(c.req.query("page") ?? "", 10) || 1,
      1,
    );
    const reviewFilter =
      c.req.query("unreviewedOnly") === "true"
        ? eq(collectionCards.isReviewed, false)
        : undefined;
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const total = await countStoredCards(tx, locationId, reviewFilter);
      const page = Math.min(
        requestedPage,
        Math.max(Math.ceil(total / pageSize), 1),
      );
      const rows = await selectStoredCards(tx)
        .where(storedCardsWhere(locationId, reviewFilter))
        .orderBy(asc(storedCardPosition), asc(collectionCards.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const data: StorageLocationCardPage = {
        cards: rows.map(toStoredCard),
        total,
        page,
        pageSize,
      };
      return { success: true, data };
    });
    return c.json(result);
  })
  .get("/:guid/cards/next-unreviewed", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const [row] = await tx
        .select({ scanId: collectionCards.guid })
        .from(collectionCards)
        .innerJoin(
          collections,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(
          storedCardsWhere(locationId, eq(collectionCards.isReviewed, false)),
        )
        .orderBy(asc(storedCardPosition), asc(collectionCards.id))
        .limit(1);
      return { success: true, data: row?.scanId ?? null };
    });
    return c.json(result);
  })
  .get("/:guid/cards/:scanId/context", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const scanId = c.req.param("scanId");
    const reviewFilter =
      c.req.query("unreviewedOnly") === "true"
        ? eq(collectionCards.isReviewed, false)
        : undefined;
    if (!UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Invalid card id." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const [current] = await selectStoredCards(tx)
        .where(storedCardsWhere(locationId, eq(collectionCards.guid, scanId)))
        .limit(1);
      if (!current) return { success: true, data: null };
      const currentKey = sql`(${Number(current.position)}::int, ${current.rowId}::int)`;
      const data: StorageLocationCardContext = {
        card: toStoredCard(current),
        index: await countStoredCards(
          tx,
          locationId,
          sql`${storedCardOrderKey} < ${currentKey}`,
        ),
        total: await countStoredCards(tx, locationId),
        previous: await findStoredCardNeighbor(
          tx,
          locationId,
          "previous",
          currentKey,
          reviewFilter,
        ),
        next: await findStoredCardNeighbor(
          tx,
          locationId,
          "next",
          currentKey,
          reviewFilter,
        ),
      };
      return { success: true, data };
    });
    return c.json(result);
  })
  .get("/:guid/cards/export", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
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
          card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`${collectionCards.card}`)}`,
          isFoil: collectionCards.isFoil,
          foilType: collectionCards.foilType,
          condition: collectionCards.condition,
          language: collectionCards.language,
          collectionName: collections.name,
          gameKey: games.key,
        })
        .from(collectionCards)
        .innerJoin(
          collections,
          eq(collections.id, collectionCards.collectionId),
        )
        .leftJoin(games, eq(games.id, collections.gameId))
        .where(
          and(
            eq(collectionCards.locationId, location.id),
            eq(collections.isDeleted, false),
          ),
        )
        .orderBy(asc(collectionCards.locationPosition));
      const data: StorageLocationExportCard[] = rows.map((r) => ({
        scanId: r.scanId!,
        position: r.position ?? 0,
        collectionName: r.collectionName,
        gameKey: r.gameKey,
        card: r.card,
        isFoil: r.isFoil,
        foilType: r.foilType,
        condition: toCardCondition(r.condition),
        language: r.language,
      }));
      return { success: true, data };
    });
    return c.json(result);
  })
  .post("/:guid/cards/from-collection", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req
      .json<{ collectionGuid?: unknown }>()
      .catch(() => ({ collectionGuid: undefined }));
    const collectionGuid = body.collectionGuid;
    if (
      !UUID_PATTERN.test(guid) ||
      typeof collectionGuid !== "string" ||
      !UUID_PATTERN.test(collectionGuid)
    ) {
      return c.json({ success: false, message: "Invalid request." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      if (!(await isStorageAllowed(tx, orgId))) {
        return {
          success: false,
          message: STORAGE_UPGRADE_MESSAGE,
          upgradeRequired: true,
        };
      }
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) =>
          and(
            eq(t.guid, collectionGuid),
            eq(t.orgId, orgId),
            eq(t.isDeleted, false),
          ),
        columns: { id: true },
      });
      if (!collection) {
        return { success: false, message: "Collection not found." };
      }
      const movedScanIds = await moveCollectionToLocation(tx, {
        collectionId: collection.id,
        locationId,
      });
      await tx
        .update(storageLocations)
        .set({ lastUsedAt: new Date() })
        .where(eq(storageLocations.id, locationId));
      return {
        success: true,
        movedScanIds,
        data: {
          moved: movedScanIds.length,
          locations: await loadLocations(tx, orgId),
        },
      };
    });
    if (result.success && "movedScanIds" in result && result.movedScanIds) {
      const { movedScanIds, ...body } = result;
      emitCardsStoredWebhook(orgId, guid, movedScanIds);
      return c.json(body);
    }
    return c.json(result);
  })
  .post("/:guid/cards", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req
      .json<{ scanIds?: unknown }>()
      .catch(() => ({ scanIds: undefined }));
    const scanIds = Array.isArray(body.scanIds)
      ? body.scanIds.filter(
          (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
        )
      : [];
    if (
      !UUID_PATTERN.test(guid) ||
      scanIds.length === 0 ||
      scanIds.length > STORAGE_MOVE_CARDS_MAX
    ) {
      return c.json({ success: false, message: "Invalid cards." }, 400);
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
        columns: { id: true },
      });
      if (!location) {
        return { success: false, message: "Storage location not found." };
      }
      const movedScanIds = await moveCardsToLocation(tx, {
        orgId,
        locationId: location.id,
        scanIds,
      });
      await tx
        .update(storageLocations)
        .set({ lastUsedAt: new Date() })
        .where(eq(storageLocations.id, location.id));
      return {
        success: true,
        movedScanIds,
        data: {
          moved: movedScanIds.length,
          locations: await loadLocations(tx, orgId),
        },
      };
    });
    if (result.success && "movedScanIds" in result && result.movedScanIds) {
      const { movedScanIds, ...body } = result;
      emitCardsStoredWebhook(orgId, guid, movedScanIds);
      return c.json(body);
    }
    return c.json(result);
  })
  .delete("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const scanId = c.req.param("scanId");
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
  });

export { router as storageLocationsRouter };
