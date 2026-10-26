import {
  creditOfferFor,
  INTAKE_LOTS_LIST_LIMIT,
  INTAKE_NOTES_MAX_LENGTH,
  INTAKE_LANG_MAX_LENGTH,
  INTAKE_PAYOUT_METHODS,
  INTAKE_TEXT_MAX_LENGTH,
  SET_NAME_MAX_LENGTH,
  roundCurrency,
  spreadTotal,
  type IntakeAcceptInput,
  type IntakeCancelInput,
  type IntakeTransferInput,
  type IntakeTransferResult,
  type IntakeLot,
  type PagedList,
  type IntakeLotDetail,
  type IntakeLotInput,
  type IntakePayoutMethod,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  collectionCards,
  collections,
  intakeLots,
  unmatchedCards,
} from "../../db/schema";
import { collectionNameTaken } from "../collections/shared";
import { logActivity } from "../../lib/activity-log";
import { loadBusinessSettings } from "../../lib/business-access";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { parsePageParams, resolvePageWindow } from "../../lib/paging";
import type { IntakeLotRow } from "../../lib/interfaces/business";
import type { Transaction } from "../../db";
import {
  createIntakeCollection,
  findIntakeLot,
  findNextUnreviewedLotCard,
  loadIntakeCardContext,
  loadUnreviewedLotCards,
  retireIntakeCollection,
  loadIntakeLotCards,
  selectIntakeLots,
  summarizeIntakeCards,
  toIntakeLot,
} from "../../lib/intake";
import { loadOrgPricing } from "../../lib/price-source";
import { deleteScanImages } from "../../lib/scan-images";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  businessQuery,
  cleanText,
  notFound,
  pricingCurrency,
  readJson,
  toMoney,
  updateAcquisitionCosts,
} from "./shared";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
  INTAKE_LOT_NOT_FOUND_MESSAGE,
} from "../../lib/constants/business";

async function toLiveIntakeLots(
  tx: Transaction,
  orgId: string,
  rows: IntakeLotRow[],
  canViewCosts: boolean,
): Promise<IntakeLot[]> {
  const settings = await loadBusinessSettings(tx, orgId);
  const pricing = await loadOrgPricing(tx, orgId);
  const lots: IntakeLot[] = [];
  for (const row of rows) {
    const live =
      row.status === "open"
        ? summarizeIntakeCards(
            await loadIntakeLotCards(tx, row.id, pricing, settings.buylist),
            settings.buylist,
          )
        : null;
    lots.push(await toIntakeLot(row, live, canViewCosts));
  }
  return lots;
}

export const intakeRoute = new Hono<AppEnv>()
  .get("/intake", requireAuth, requireOrg, (c) => {
    const params = parsePageParams(c);
    return businessQuery(c, async (tx, access) => {
      const orgId = c.get("orgId");
      const live = eq(intakeLots.isDeleted, false);
      const ordered = await tx
        .select({ guid: intakeLots.guid })
        .from(intakeLots)
        .where(and(eq(intakeLots.orgId, orgId), live))
        .orderBy(desc(intakeLots.createdAt), desc(intakeLots.id));
      const window = resolvePageWindow(
        params,
        ordered.map((row) => row.guid),
      );
      const rows = window.guids.length
        ? await selectIntakeLots(tx).where(
            and(
              eq(intakeLots.orgId, orgId),
              live,
              inArray(intakeLots.guid, window.guids),
            ),
          )
        : [];
      rows.sort(
        (a, b) => window.guids.indexOf(a.guid!) - window.guids.indexOf(b.guid!),
      );
      const data: PagedList<IntakeLot> = {
        items: await toLiveIntakeLots(tx, orgId, rows, access.canViewCosts),
        total: window.total,
        page: window.page,
        pageSize: window.pageSize,
      };
      return { success: true, data };
    });
  })
  .get("/intake/open", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      const orgId = c.get("orgId");
      const rows = await selectIntakeLots(tx)
        .where(
          and(
            eq(intakeLots.orgId, orgId),
            eq(intakeLots.status, "open"),
            eq(intakeLots.isDeleted, false),
          ),
        )
        .orderBy(desc(intakeLots.createdAt))
        .limit(INTAKE_LOTS_LIST_LIMIT);
      return {
        success: true,
        data: await toLiveIntakeLots(tx, orgId, rows, access.canViewCosts),
      };
    }),
  )
  .post("/intake", requireAuth, requireOrg, async (c) => {
    const body = await readJson<IntakeLotInput>(c);
    const customerName = cleanText(body.customerName, INTAKE_TEXT_MAX_LENGTH);
    const collectionGuid = body.collectionGuid;
    const newCollection = body.newCollection;
    const validNew =
      !!newCollection &&
      typeof newCollection.gameGuid === "string" &&
      UUID_PATTERN.test(newCollection.gameGuid) &&
      typeof newCollection.lang === "string" &&
      newCollection.lang.length > 0 &&
      newCollection.lang.length <= INTAKE_LANG_MAX_LENGTH;
    const validExisting =
      typeof collectionGuid === "string" && UUID_PATTERN.test(collectionGuid);
    if (!customerName || validNew === validExisting) {
      return c.json({ success: false, message: "Invalid intake lot." }, 400);
    }
    let createdCollection = false;
    const response = await businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      const orgId = c.get("orgId");
      const collection = validNew
        ? await createIntakeCollection(tx, orgId, customerName, newCollection!)
        : await tx.query.collections.findFirst({
            where: (t, { eq, and }) =>
              and(
                eq(t.guid, collectionGuid!),
                eq(t.orgId, orgId),
                eq(t.isDeleted, false),
              ),
            columns: { id: true, name: true },
          });
      if (!collection) {
        return notFound(validNew ? "Game not found." : "Collection not found.");
      }
      const open = await tx.query.intakeLots.findFirst({
        where: and(
          eq(intakeLots.collectionId, collection.id),
          eq(intakeLots.status, "open"),
          eq(intakeLots.isDeleted, false),
        ),
        columns: { id: true },
      });
      if (open) {
        return {
          success: false,
          message:
            "That collection already has an open intake lot. Accept or cancel it first.",
        };
      }
      const [created] = await tx
        .insert(intakeLots)
        .values({
          orgId,
          collectionId: collection.id,
          ownsCollection: validNew,
          customerName,
          customerContact: cleanText(
            body.customerContact,
            INTAKE_TEXT_MAX_LENGTH,
          ),
          notes: cleanText(body.notes, INTAKE_NOTES_MAX_LENGTH),
          createdByUserId: c.get("userId"),
        })
        .returning({ guid: intakeLots.guid });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "intake.created",
        summary: customerName,
        details: { lotGuid: created.guid, collectionName: collection.name },
      });
      createdCollection = validNew;
      return { success: true, data: { guid: created.guid } };
    });
    if (createdCollection && response.status === 200) {
      emitToOrg(c.get("orgId"), "collections_changed", {});
    }
    return response;
  })
  .get("/intake/:guid", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      const orgId = c.get("orgId");
      const row = await findIntakeLot(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      const settings = await loadBusinessSettings(tx, orgId);
      const pricing = await loadOrgPricing(tx, orgId);
      const cards = await loadIntakeLotCards(
        tx,
        row.id,
        pricing,
        settings.buylist,
      );
      const lot = await toIntakeLot(
        row,
        row.status === "open"
          ? summarizeIntakeCards(cards, settings.buylist)
          : null,
        access.canViewCosts,
      );
      const [inSource] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(collectionCards)
        .where(
          and(
            eq(collectionCards.intakeLotId, row.id),
            eq(collectionCards.collectionId, row.collectionId),
          ),
        );
      const data: IntakeLotDetail = {
        ...lot,
        cardCount: cards.length,
        cardsInSource: Number(inSource?.count ?? 0),
        cards: access.canViewCosts
          ? cards
          : cards.map((card) => ({
              ...card,
              marketPrice: null,
              offer: null,
              acquisitionCost: null,
            })),
      };
      return { success: true, data };
    }),
  )
  .get("/intake/:guid/cards/next-unreviewed", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const row = await findIntakeLot(tx, c.get("orgId"), c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      return { success: true, data: await findNextUnreviewedLotCard(tx, row.id) };
    }),
  )
  .get("/intake/:guid/cards/unreviewed", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const row = await findIntakeLot(tx, c.get("orgId"), c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      return { success: true, data: await loadUnreviewedLotCards(tx, row.id) };
    }),
  )
  .get("/intake/:guid/cards/:scanId/context", requireAuth, requireOrg, (c) => {
    const scanId = c.req.param("scanId");
    if (!UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Invalid card id." }, 400);
    }
    return businessQuery(c, async (tx) => {
      const row = await findIntakeLot(tx, c.get("orgId"), c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      return {
        success: true,
        data: await loadIntakeCardContext(
          tx,
          row.id,
          scanId,
          c.req.query("unreviewedOnly") === "true",
        ),
      };
    });
  })
  .post("/intake/:guid/accept", requireAuth, requireOrg, async (c) => {
    const body = await readJson<IntakeAcceptInput>(c);
    const payoutMethod = body.payoutMethod;
    if (!INTAKE_PAYOUT_METHODS.includes(payoutMethod as IntakePayoutMethod)) {
      return c.json({ success: false, message: "Invalid payout." }, 400);
    }
    const override =
      body.totalOverride == null ? null : toMoney(body.totalOverride);
    if (body.totalOverride != null && override === null) {
      return c.json({ success: false, message: "Invalid total." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (!access.canAcceptIntake) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const row = await findIntakeLot(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      if (row.status !== "open") {
        return { success: false, message: "This lot is already closed." };
      }
      const settings = await loadBusinessSettings(tx, orgId);
      const pricing = await loadOrgPricing(tx, orgId);
      const currency = pricingCurrency(pricing);
      const cards = await loadIntakeLotCards(
        tx,
        row.id,
        pricing,
        settings.buylist,
      );
      const summary = summarizeIntakeCards(cards, settings.buylist);
      const cashTotal = override ?? summary.cashOffer;
      const costs =
        override === null
          ? cards.map((card) => card.offer ?? 0)
          : spreadTotal(
              cards.map((card) => card.offer || card.marketPrice || 0),
              override,
            );
      const now = new Date();
      await updateAcquisitionCosts(tx, {
        orgId,
        currency,
        acquiredAt: now,
        rows: cards.map((card, i) => ({ scanId: card.scanId, cost: costs[i] })),
      });
      const paidTotal =
        payoutMethod === "credit"
          ? creditOfferFor(cashTotal, settings.buylist)
          : roundCurrency(cashTotal);
      await tx
        .update(intakeLots)
        .set({
          status: "accepted",
          payoutMethod,
          marketTotal: summary.marketTotal,
          cashOffer: cashTotal,
          creditOffer: creditOfferFor(cashTotal, settings.buylist),
          paidTotal,
          currency,
          cardCount: cards.length,
          closedByUserId: c.get("userId"),
          acceptedAt: now,
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(intakeLots.id, row.id));
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "intake.accepted",
        summary: row.customerName,
        details: {
          lotGuid: row.guid,
          cards: cards.length,
          payoutMethod,
          paidTotal,
          currency,
        },
      });
      return { success: true, data: null };
    });
  })
  .post("/intake/:guid/transfer", requireAuth, requireOrg, async (c) => {
    const body = await readJson<IntakeTransferInput>(c);
    const newName = cleanText(body.newCollectionName, SET_NAME_MAX_LENGTH);
    const targetGuid =
      typeof body.targetCollectionGuid === "string" &&
      UUID_PATTERN.test(body.targetCollectionGuid)
        ? body.targetCollectionGuid
        : null;
    if (!newName === !targetGuid) {
      return c.json({ success: false, message: "Choose a collection." }, 400);
    }
    let committed = false;
    let sourceGuid: string | null = null;
    let movedScanIds: string[] = [];
    const response = await businessQuery(c, async (tx, access) => {
      if (!access.canAcceptIntake) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const row = await findIntakeLot(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      if (row.status !== "accepted") {
        return { success: false, message: "Accept the lot before moving its cards." };
      }
      const source = await tx.query.collections.findFirst({
        where: eq(collections.id, row.collectionId),
        columns: { id: true, gameId: true, lang: true },
      });
      if (!source) return notFound("Collection not found.");
      let target: { id: number; guid: string | null } | undefined;
      if (newName) {
        if (await collectionNameTaken(tx, orgId, newName)) {
          return {
            success: false,
            message: `A collection named "${newName}" already exists.`,
          };
        }
        [target] = await tx
          .insert(collections)
          .values({
            name: newName,
            orgId,
            gameId: source.gameId,
            lang: source.lang,
            isActive: false,
          })
          .returning({ id: collections.id, guid: collections.guid });
      } else {
        const found = await tx.query.collections.findFirst({
          where: and(
            eq(collections.guid, targetGuid!),
            eq(collections.orgId, orgId),
            eq(collections.isDeleted, false),
          ),
          columns: { id: true, guid: true, gameId: true },
        });
        if (!found || found.id === source.id) {
          return notFound("Collection not found.");
        }
        if (found.gameId !== source.gameId) {
          return {
            success: false,
            message: "Choose a collection for the same game.",
          };
        }
        target = found;
      }
      const moved = await tx
        .update(collectionCards)
        .set({ collectionId: target!.id, binNumber: null, updatedAt: new Date() })
        .where(
          and(
            eq(collectionCards.intakeLotId, row.id),
            eq(collectionCards.collectionId, source.id),
            eq(collectionCards.orgId, orgId),
          ),
        )
        .returning({ guid: collectionCards.guid });
      if (row.ownsCollection) {
        await tx
          .update(unmatchedCards)
          .set({ collectionId: target!.id, binNumber: null })
          .where(
            and(
              eq(unmatchedCards.collectionId, source.id),
              eq(unmatchedCards.isDeleted, false),
            ),
          );
      }
      const deleteSource = body.deleteSource === true && row.ownsCollection;
      if (deleteSource) {
        await retireIntakeCollection(tx, orgId, source.id);
      }
      const sourceRow = await tx.query.collections.findFirst({
        where: eq(collections.id, source.id),
        columns: { isDeleted: true },
      });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "intake.transferred",
        summary: row.customerName,
        details: {
          lotGuid: row.guid,
          cards: moved.length,
          collectionGuid: target!.guid,
        },
      });
      sourceGuid = row.collectionGuid;
      movedScanIds = moved.map((m) => m.guid!);
      committed = true;
      const data: IntakeTransferResult = {
        moved: moved.length,
        collectionGuid: target!.guid!,
        sourceDeleted: sourceRow?.isDeleted ?? false,
      };
      return { success: true, data };
    });
    if (committed && response.status === 200) {
      const orgId = c.get("orgId");
      const fromGuid = sourceGuid as string | null;
      if (fromGuid && movedScanIds.length > 0) {
        emitToSession(fromGuid, "cards_removed", { scanIds: movedScanIds });
      }
      emitToOrg(orgId, "collections_changed", {});
    }
    return response;
  })
  .post("/intake/:guid/cancel", requireAuth, requireOrg, async (c) => {
    const body = await readJson<IntakeCancelInput>(c);
    const removeCards = body.removeCards === true;
    let removed: { collectionGuid: string; scanIds: string[] } | null = null;
    let imageKeys: (string | null)[] = [];
    let committed = false;
    const response = await businessQuery(c, async (tx, access) => {
      if (!access.canAcceptIntake) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const row = await findIntakeLot(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      if (row.status !== "open") {
        return { success: false, message: "This lot is already closed." };
      }
      const now = new Date();
      let removedCount = 0;
      if (removeCards) {
        const deleted = await tx
          .delete(collectionCards)
          .where(
            and(
              eq(collectionCards.intakeLotId, row.id),
              eq(collectionCards.orgId, orgId),
            ),
          )
          .returning({
            guid: collectionCards.guid,
            imageKey: collectionCards.capturedImageKey,
          });
        removedCount = deleted.length;
        imageKeys = deleted.map((d) => d.imageKey);
        removed = {
          collectionGuid: row.collectionGuid!,
          scanIds: deleted.map((d) => d.guid!),
        };
      }
      if (row.ownsCollection) {
        await retireIntakeCollection(tx, orgId, row.collectionId);
      }
      await tx
        .update(intakeLots)
        .set({
          status: "cancelled",
          closedByUserId: c.get("userId"),
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(intakeLots.id, row.id));
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "intake.cancelled",
        summary: row.customerName,
        details: { lotGuid: row.guid, removedCards: removedCount },
      });
      committed = true;
      return { success: true, data: null };
    });
    const done = removed as { collectionGuid: string; scanIds: string[] } | null;
    if (committed && response.status === 200) {
      emitToOrg(c.get("orgId"), "collections_changed", {});
    }
    if (committed && response.status === 200 && done && done.scanIds.length > 0) {
      deleteScanImages(imageKeys);
      emitToSession(done.collectionGuid, "cards_removed", {
        scanIds: done.scanIds,
      });
      emitToOrg(c.get("orgId"), "collections_changed", {
        guid: done.collectionGuid,
      });
    }
    return response;
  })
  .delete("/intake/:guid", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (!access.canAcceptIntake) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const row = await findIntakeLot(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      if (row.status === "open") {
        return {
          success: false,
          message: "Accept or cancel the lot before deleting it.",
        };
      }
      await tx
        .update(intakeLots)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(intakeLots.id, row.id));
      return { success: true, data: null };
    }),
  );
