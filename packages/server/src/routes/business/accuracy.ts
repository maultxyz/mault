import {
  ACCURACY_CHECKS_LIST_LIMIT,
  ACCURACY_SAMPLE_SIZES,
  toCardCondition,
  wilsonInterval,
  type AccuracyBatchStats,
  type AccuracyCheck,
  type AccuracyCheckDetail,
  type AccuracyCheckInput,
  type AccuracyReport,
  type AccuracySampleInput,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import {
  accuracyChecks,
  collectionCards,
  collections,
  games,
  intakeLots,
  unmatchedCards,
} from "../../db/schema";
import { hydrateSavedCards } from "../../lib/saved-cards";
import { logActivity } from "../../lib/activity-log";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { resolveScanImageUrl } from "../../lib/scan-images";
import {
  getUserDisplayName,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import {
  businessQuery,
  notFound,
  readJson,
} from "./shared";
import type { StoredAccuracySample } from "../../lib/interfaces/business";
import {
  BUSINESS_UPGRADE_REQUIRED_RESULT,
  SPOT_CHECK_NOT_FOUND_MESSAGE,
} from "../../lib/constants/business";

function toSamples(value: unknown): StoredAccuracySample[] {
  return Array.isArray(value)
    ? value
        .map((raw) => (raw ?? {}) as Record<string, unknown>)
        .filter((raw) => typeof raw.scanId === "string")
        .map((raw) => ({
          scanId: raw.scanId as string,
          result:
            raw.result === "correct" || raw.result === "incorrect"
              ? raw.result
              : null,
        }))
    : [];
}

async function findBatch(
  tx: Transaction,
  orgId: string,
  collectionGuid: string,
  lotGuid: string | null,
) {
  if (!UUID_PATTERN.test(collectionGuid)) return null;
  const collection = await tx.query.collections.findFirst({
    where: and(
      eq(collections.guid, collectionGuid),
      eq(collections.orgId, orgId),
      eq(collections.isDeleted, false),
    ),
    columns: { id: true, name: true },
  });
  if (!collection) return null;
  if (!lotGuid) return { collection, lot: null };
  if (!UUID_PATTERN.test(lotGuid)) return null;
  const lot = await tx.query.intakeLots.findFirst({
    where: and(
      eq(intakeLots.guid, lotGuid),
      eq(intakeLots.collectionId, collection.id),
      eq(intakeLots.isDeleted, false),
    ),
    columns: { id: true, createdAt: true, closedAt: true },
  });
  return lot ? { collection, lot } : null;
}

function batchCardsWhere(collectionId: number, lotId: number | null): SQL {
  return and(
    eq(collectionCards.collectionId, collectionId),
    lotId === null ? undefined : eq(collectionCards.intakeLotId, lotId),
  )!;
}

async function toCheck(
  row: typeof accuracyChecks.$inferSelect,
  collection: { guid: string | null; name: string },
  lotGuid: string | null,
): Promise<AccuracyCheck> {
  const samples = toSamples(row.samples);
  const checked = samples.filter((s) => s.result !== null);
  const incorrect = checked.filter((s) => s.result === "incorrect").length;
  return {
    guid: row.guid!,
    collectionGuid: collection.guid!,
    collectionName: collection.name,
    intakeLotGuid: lotGuid,
    sampleSize: samples.length,
    checked: checked.length,
    incorrect,
    status: row.status === "completed" ? "completed" : "open",
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdByName: row.createdByUserId
      ? await getUserDisplayName(row.createdByUserId)
      : null,
    estimate: wilsonInterval(checked.length - incorrect, checked.length),
  };
}

async function findCheck(tx: Transaction, orgId: string, guid: string) {
  if (!UUID_PATTERN.test(guid)) return null;
  const [row] = await tx
    .select({
      check: accuracyChecks,
      collectionGuid: collections.guid,
      collectionName: collections.name,
      lotGuid: intakeLots.guid,
    })
    .from(accuracyChecks)
    .innerJoin(collections, eq(collections.id, accuracyChecks.collectionId))
    .leftJoin(intakeLots, eq(intakeLots.id, accuracyChecks.intakeLotId))
    .where(
      and(
        eq(accuracyChecks.guid, guid),
        eq(accuracyChecks.orgId, orgId),
        eq(accuracyChecks.isDeleted, false),
      ),
    )
    .limit(1);
  return row ?? null;
}

export const accuracyRoute = new Hono<AppEnv>()
  .get("/accuracy", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const orgId = c.get("orgId");
      const batch = await findBatch(
        tx,
        orgId,
        c.req.query("collection") ?? "",
        c.req.query("lot") || null,
      );
      if (!batch) return notFound("Collection not found.");
      const lotId = batch.lot?.id ?? null;
      const [stats] = await tx
        .select({
          cardCount: sql<number>`count(*)::int`,
          corrected: sql<number>`count(*) FILTER (WHERE ${collectionCards.isCorrected})::int`,
          lowConfidence: sql<number>`count(*) FILTER (WHERE ${collectionCards.lowConfidenceMatch})::int`,
          withAlternatives: sql<number>`count(*) FILTER (WHERE ${collectionCards.hasAlternativeMatches})::int`,
          reviewed: sql<number>`count(*) FILTER (WHERE ${collectionCards.isReviewed})::int`,
        })
        .from(collectionCards)
        .where(batchCardsWhere(batch.collection.id, lotId));
      const [unmatched] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(unmatchedCards)
        .where(
          and(
            eq(unmatchedCards.collectionId, batch.collection.id),
            eq(unmatchedCards.isDeleted, false),
            batch.lot
              ? sql`${unmatchedCards.scannedAt} >= ${batch.lot.createdAt}`
              : undefined,
            batch.lot?.closedAt
              ? sql`${unmatchedCards.scannedAt} <= ${batch.lot.closedAt}`
              : undefined,
          ),
        );
      const checkRows = await tx
        .select({ check: accuracyChecks, lotGuid: intakeLots.guid })
        .from(accuracyChecks)
        .leftJoin(intakeLots, eq(intakeLots.id, accuracyChecks.intakeLotId))
        .where(
          and(
            eq(accuracyChecks.orgId, orgId),
            eq(accuracyChecks.collectionId, batch.collection.id),
            eq(accuracyChecks.isDeleted, false),
            lotId === null ? undefined : eq(accuracyChecks.intakeLotId, lotId),
          ),
        )
        .orderBy(desc(accuracyChecks.createdAt))
        .limit(ACCURACY_CHECKS_LIST_LIMIT);
      const collection = {
        guid: c.req.query("collection") ?? null,
        name: batch.collection.name,
      };
      const checks = [];
      for (const row of checkRows) {
        checks.push(await toCheck(row.check, collection, row.lotGuid));
      }
      const data: AccuracyReport = {
        stats: {
          cardCount: Number(stats?.cardCount ?? 0),
          corrected: Number(stats?.corrected ?? 0),
          lowConfidence: Number(stats?.lowConfidence ?? 0),
          withAlternatives: Number(stats?.withAlternatives ?? 0),
          reviewed: Number(stats?.reviewed ?? 0),
          unmatched: Number(unmatched?.count ?? 0),
        } satisfies AccuracyBatchStats,
        checks,
      };
      return { success: true, data };
    }),
  )
  .post("/accuracy/checks", requireAuth, requireOrg, async (c) => {
    const body = await readJson<AccuracyCheckInput>(c);
    const sampleSize = Number(body.sampleSize);
    if (
      typeof body.collectionGuid !== "string" ||
      !(ACCURACY_SAMPLE_SIZES as readonly number[]).includes(sampleSize)
    ) {
      return c.json({ success: false, message: "Invalid spot check." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      const orgId = c.get("orgId");
      const batch = await findBatch(
        tx,
        orgId,
        body.collectionGuid!,
        body.intakeLotGuid ?? null,
      );
      if (!batch) return notFound("Collection not found.");
      const picked = await tx
        .select({ scanId: collectionCards.guid })
        .from(collectionCards)
        .where(
          and(
            batchCardsWhere(batch.collection.id, batch.lot?.id ?? null),
            body.unreviewedOnly
              ? eq(collectionCards.isReviewed, false)
              : undefined,
          ),
        )
        .orderBy(sql`random()`)
        .limit(sampleSize);
      if (picked.length === 0) {
        return { success: false, message: "There are no cards to check." };
      }
      const [created] = await tx
        .insert(accuracyChecks)
        .values({
          orgId,
          collectionId: batch.collection.id,
          intakeLotId: batch.lot?.id ?? null,
          sampleSize: picked.length,
          samples: picked.map((p) => ({ scanId: p.scanId, result: null })),
          createdByUserId: c.get("userId"),
        })
        .returning({ guid: accuracyChecks.guid });
      return { success: true, data: { guid: created.guid } };
    });
  })
  .get("/accuracy/checks/:guid", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const orgId = c.get("orgId");
      const found = await findCheck(tx, orgId, c.req.param("guid"));
      if (!found) return notFound(SPOT_CHECK_NOT_FOUND_MESSAGE);
      const samples = toSamples(found.check.samples);
      const ids = samples.map((s) => s.scanId);
      const cards = ids.length
        ? await tx
            .select({
              scanId: collectionCards.guid,
              card: sql<PlayingCardWithDistance>`(${collectionCards.card} - 'raw')`,
              isFoil: collectionCards.isFoil,
              condition: collectionCards.condition,
              capturedImageKey: collectionCards.capturedImageKey,
              capturedImageDataUrl: collectionCards.capturedImageDataUrl,
              collectionLang: collections.lang,
              gameKey: games.key,
            })
            .from(collectionCards)
            .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
            .leftJoin(games, eq(games.id, collections.gameId))
            .where(
              and(
                eq(collectionCards.orgId, orgId),
                inArray(collectionCards.guid, ids),
              ),
            )
        : [];
      const hydratedCards = await hydrateSavedCards(
        cards.map((card) => ({ gameKey: card.gameKey, lang: card.collectionLang, card: card.card })),
        { includeRaw: false },
      );
      const byId = new Map(
        cards.map((card, i) => [card.scanId, { ...card, card: hydratedCards[i] }]),
      );
      const check = await toCheck(
        found.check,
        { guid: found.collectionGuid, name: found.collectionName },
        found.lotGuid,
      );
      const detailSamples = [];
      for (const sample of samples) {
        const card = byId.get(sample.scanId);
        detailSamples.push({
          scanId: sample.scanId,
          result: sample.result,
          card: card?.card ?? null,
          isFoil: card?.isFoil ?? false,
          condition: toCardCondition(card?.condition),
          capturedImageUrl: card
            ? ((await resolveScanImageUrl(card)) ?? null)
            : null,
        });
      }
      const data: AccuracyCheckDetail = { ...check, samples: detailSamples };
      return { success: true, data };
    }),
  )
  .put("/accuracy/checks/:guid/samples", requireAuth, requireOrg, async (c) => {
    const body = await readJson<AccuracySampleInput>(c);
    const result =
      body.result === "correct" || body.result === "incorrect"
        ? body.result
        : null;
    if (typeof body.scanId !== "string") {
      return c.json({ success: false, message: "Invalid sample." }, 400);
    }
    return businessQuery(c, async (tx) => {
      const orgId = c.get("orgId");
      const found = await findCheck(tx, orgId, c.req.param("guid"));
      if (!found) return notFound(SPOT_CHECK_NOT_FOUND_MESSAGE);
      if (found.check.status !== "open") {
        return { success: false, message: "This spot check is finished." };
      }
      const samples = toSamples(found.check.samples);
      const sample = samples.find((s) => s.scanId === body.scanId);
      if (!sample) return notFound("Card isn't part of this spot check.");
      sample.result = result;
      await tx
        .update(accuracyChecks)
        .set({ samples, updatedAt: new Date() })
        .where(eq(accuracyChecks.id, found.check.id));
      if (result === "correct") {
        await tx
          .update(collectionCards)
          .set({ isReviewed: true, lowConfidenceMatch: false })
          .where(
            and(
              eq(collectionCards.guid, sample.scanId),
              eq(collectionCards.orgId, orgId),
            ),
          );
      }
      return { success: true, data: null };
    });
  })
  .post("/accuracy/checks/:guid/complete", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const orgId = c.get("orgId");
      const found = await findCheck(tx, orgId, c.req.param("guid"));
      if (!found) return notFound(SPOT_CHECK_NOT_FOUND_MESSAGE);
      const now = new Date();
      await tx
        .update(accuracyChecks)
        .set({ status: "completed", completedAt: now, updatedAt: now })
        .where(eq(accuracyChecks.id, found.check.id));
      const check = await toCheck(
        found.check,
        { guid: found.collectionGuid, name: found.collectionName },
        found.lotGuid,
      );
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "accuracy.completed",
        summary: found.collectionName,
        details: {
          checkGuid: check.guid,
          checked: check.checked,
          incorrect: check.incorrect,
          accuracy: check.estimate?.accuracy ?? null,
        },
      });
      return { success: true, data: null };
    }),
  )
  .delete("/accuracy/checks/:guid", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const found = await findCheck(tx, c.get("orgId"), c.req.param("guid"));
      if (!found) return notFound(SPOT_CHECK_NOT_FOUND_MESSAGE);
      await tx
        .update(accuracyChecks)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(accuracyChecks.id, found.check.id));
      return { success: true, data: null };
    }),
  );
