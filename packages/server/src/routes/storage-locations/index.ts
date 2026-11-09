import { cardWithStoredPricesSql } from "../../lib/card-price-sql";
import {
  STORAGE_CARDS_PAGE_SIZE,
  STORAGE_CARDS_PAGE_SIZE_MAX,
  STORAGE_MOVE_CARDS_MAX,
  STORAGE_SEARCH_QUERY_MAX_LENGTH,
  STORAGE_SEARCH_RESULT_LIMIT,
  normalizePickListEntries,
  storageLocationCsvExportRequestSchema,
  storagePickListRequestSchema,
  toCardCondition,
  type FieldMeta,
  type PagedList,
  type PlayingCardWithDistance,
  type StorageLocation,
  type StorageLocationCard,
  type StorageLocationCardContext,
  type StorageLocationCardPage,
  type StorageLocationCardsSummary,
  type StorageRemoveCardsResult,
  SORTABLE_FIELD_TYPES,
  type StorageLocationSearchResult,
} from "@magic-vault/shared";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
import { hydrateSavedCards } from "../../lib/saved-cards";
import { canViewCardCosts } from "../../lib/business-access";
import { emitToSession } from "../../lib/session-stream";
import { uuidArraySql } from "../../lib/sql-arrays";
import { buildCardExport, csvResponse } from "../../lib/card-export";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { storageShareLinkRoute } from "./share-link";
import { parseCardsQuery, parseScanIds } from "../collections/cards-query";
import { loadOrgPricing } from "../../lib/price-source";
import {
  findLocationId,
  loadLocationCardStats,
  loadLocationFieldDefinitions,
  loadStoredCardIdsPage,
  loadStoredCardNavigation,
  loadStoredCardsByRowIds,
  loadStoragePickList,
  loadStorageVerifyCards,
  removeCardsFromLocations,
  selectLocatedCards,
  toLocatedCards,
  loadStorageLocationExportCards,
  loadStorageLocationExportSummary,
  loadLocations,
  locationNameTaken,
  orderedLocationGuids,
  parseLocationName,
  selectStoredCards,
  storedCardPosition,
  storedCardsWhere,
  toStoredCards,
  visibleAcquisitionCost,
} from "./shared";

function parseStoredCardsQuery(params: Record<string, string | undefined>) {
  return {
    ...parseCardsQuery(params),
    grouped: false,
    unreviewed: params.unreviewedOnly === "true",
  };
}

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
    const data = await authQuery(c.get("jwtClaims"), async (tx) =>
      toLocatedCards(
        await selectLocatedCards(tx)
          .where(
            and(
              eq(storageLocations.orgId, orgId),
              eq(collections.isDeleted, false),
              sql`strpos(lower(${collectionCards.cardName}), ${query}) > 0`,
            ),
          )
          .orderBy(
            asc(collectionCards.cardName),
            asc(storageLocations.name),
            asc(collectionCards.locationPosition),
          )
          .limit(STORAGE_SEARCH_RESULT_LIMIT),
        await canViewCardCosts(tx, orgId, c.get("orgRole")),
      ),
    );
    return c.json({ success: true, data });
  })
  .post("/pick-list", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const input = storagePickListRequestSchema.safeParse(
      await c.req.json().catch(() => ({})),
    );
    if (!input.success) {
      return c.json({ success: false, message: "Invalid pick list." }, 400);
    }
    const entries = normalizePickListEntries(input.data.entries);
    const data = await authQuery(c.get("jwtClaims"), async (tx) =>
      loadStoragePickList(
        tx,
        orgId,
        entries,
        await canViewCardCosts(tx, orgId, c.get("orgRole")),
      ),
    );
    return c.json({ success: true, data });
  })
  .post("/remove-cards", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const scanIds = parseScanIds(
      await c.req.json<{ scanIds?: unknown }>().catch(() => ({})),
    );
    if (!scanIds) {
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
      const data: StorageRemoveCardsResult = {
        removed: await removeCardsFromLocations(tx, orgId, scanIds),
      };
      return { success: true, data };
    });
    return c.json(result);
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
        data: { guid: created.guid! },
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
      if (!(await isStorageAllowed(tx, orgId))) {
        return {
          success: false,
          message: STORAGE_UPGRADE_MESSAGE,
          upgradeRequired: true,
        };
      }
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
      return { success: true, data: null };
    });
    return c.json(result);
  })
  .delete("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
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
      await tx
        .update(storageLocations)
        .set({ isDeleted: true })
        .where(eq(storageLocations.id, location.id));
      return { success: true, data: null };
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
      const data: StorageLocationCard[] = await toStoredCards(
        rows,
        await canViewCardCosts(tx, orgId, c.get("orgRole")),
      );
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
    const query = parseStoredCardsQuery(c.req.query());
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const { rowIds, total, page } = await loadStoredCardIdsPage(
        tx,
        locationId,
        query,
        query.sort ? await loadLocationFieldDefinitions(tx, locationId) : [],
        pageSize,
        requestedPage,
      );
      const data: StorageLocationCardPage = {
        cards: await toStoredCards(
          await loadStoredCardsByRowIds(tx, rowIds),
          await canViewCardCosts(tx, orgId, c.get("orgRole")),
        ),
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
    const query = parseStoredCardsQuery(c.req.query());
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
      const navigation = await loadStoredCardNavigation(
        tx,
        locationId,
        query,
        query.sort ? await loadLocationFieldDefinitions(tx, locationId) : [],
        scanId,
        query.unreviewed === true,
      );
      if (!navigation) return { success: true, data: null };
      const data: StorageLocationCardContext = {
        card: (
          await toStoredCards(
            [current],
            await canViewCardCosts(tx, orgId, c.get("orgRole")),
          )
        )[0],
        ...navigation,
      };
      return { success: true, data };
    });
    return c.json(result);
  })
  .get("/:guid/cards/verify", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const data: StorageLocationSearchResult[] = await loadStorageVerifyCards(
        tx,
        locationId,
        await canViewCardCosts(tx, orgId, c.get("orgRole")),
      );
      return { success: true, data };
    });
    return c.json(result);
  })
  .get("/:guid/cards/summary", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      const data: StorageLocationCardsSummary = {
        stats: await loadLocationCardStats(
          tx,
          locationId,
          await loadOrgPricing(tx, orgId),
        ),
        sortableFields: (
          await loadLocationFieldDefinitions(tx, locationId)
        ).filter((field) => SORTABLE_FIELD_TYPES.includes(field.type)),
      };
      return { success: true, data };
    });
    return c.json(result);
  })
  .get("/:guid/cards/export", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      return {
        success: true,
        data: await loadStorageLocationExportCards(tx, locationId),
      };
    });
    return c.json(result);
  })
  .get("/:guid/cards/export-summary", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const locationId = await findLocationId(tx, orgId, guid);
      if (locationId === null) {
        return { success: false, message: "Storage location not found." };
      }
      return {
        success: true,
        data: await loadStorageLocationExportSummary(tx, locationId),
      };
    });
    return c.json(result);
  })
  .post("/:guid/cards/csv-export", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const input = storageLocationCsvExportRequestSchema.safeParse(
      await c.req.json().catch(() => ({})),
    );
    if (!input.success) {
      return c.json({ success: false, message: "Invalid export request." }, 400);
    }
    const loaded = await authQuery(c.get("jwtClaims"), async (tx) => {
      const location = await tx.query.storageLocations.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { id: true, name: true },
      });
      if (!location) return null;
      const cards = await loadStorageLocationExportCards(tx, location.id);
      const gameKeys = [...new Set(cards.map((card) => card.gameKey))];
      const singleGameKey = gameKeys.length === 1 ? gameKeys[0] : null;
      const game = singleGameKey
        ? await tx.query.games.findFirst({
            where: (t, { eq }) => eq(t.key, singleGameKey),
            columns: { key: true, name: true, fieldDefinitions: true },
          })
        : undefined;
      return { location, cards, gameKeys, game };
    });
    if (!loaded) {
      return c.json({ success: false, message: "Storage location not found." }, 404);
    }
    const { location, cards, gameKeys, game } = loaded;
    const result = await buildCardExport({
      format: input.data.format,
      combineDuplicates: input.data.combineDuplicates,
      cards: cards.map((card) => ({
        card: card.card,
        isFoil: card.isFoil,
        foilType: card.foilType ?? undefined,
        condition: card.condition,
        language: card.language ?? undefined,
      })),
      gameKeys,
      game: game
        ? {
            key: game.key,
            name: game.name,
            fieldDefinitions: (game.fieldDefinitions as FieldMeta[] | null) ?? [],
          }
        : null,
      exportName: location.name,
    });
    if (!result.success) return c.json(result, 400);
    return csvResponse(c, result.csv, result.filename);
  })
  .post("/:guid/cards/mark-downloaded", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const scanIds = parseScanIds(await c.req.json().catch(() => ({})));
    if (!UUID_PATTERN.test(guid) || !scanIds) {
      return c.json({ success: false, message: "Invalid card ids." }, 400);
    }
    const markedByCollection = await authQuery(
      c.get("jwtClaims"),
      async (tx) => {
        const locationId = await findLocationId(tx, orgId, guid);
        if (locationId === null) return null;
        const marked = await tx
          .update(collectionCards)
          .set({ isDownloaded: true })
          .where(
            and(
              sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
              eq(collectionCards.orgId, orgId),
              eq(collectionCards.locationId, locationId),
            ),
          )
          .returning({
            scanId: collectionCards.guid,
            collectionId: collectionCards.collectionId,
          });
        const collectionIds = [
          ...new Set(marked.map((row) => row.collectionId)),
        ];
        const collectionRows = collectionIds.length
          ? await tx
              .select({ id: collections.id, guid: collections.guid })
              .from(collections)
              .where(inArray(collections.id, collectionIds))
          : [];
        return collectionRows.map((collection) => ({
          collectionGuid: collection.guid!,
          scanIds: marked
            .filter((row) => row.collectionId === collection.id)
            .map((row) => row.scanId!),
        }));
      },
    );
    if (!markedByCollection) {
      return c.json({ success: false, message: "Storage location not found." });
    }
    for (const { collectionGuid, scanIds: markedIds } of markedByCollection) {
      emitToSession(collectionGuid, "cards_downloaded", { scanIds: markedIds });
    }
    return c.json({ success: true, data: null });
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
        data: { moved: movedScanIds.length },
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
        data: { moved: movedScanIds.length },
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
      return { success: true, data: null };
    });
    return c.json(result);
  })
  .route("/", storageShareLinkRoute);

export { router as storageLocationsRouter };
