import {
  buylistOfferFor,
  isBelowBuylistMinimum,
  creditOfferFor,
  roundCurrency,
  INTAKE_COLLECTION_NAME_PREFIX,
  INTAKE_COLLECTION_NAME_SUFFIX_ROOM,
  REVIEW_GRID_CARD_LIMIT,
  SET_NAME_MAX_LENGTH,
  toCardCondition,
  type BuylistConfig,
  type IntakeLot,
  type IntakeLotCard,
  type IntakeLotStatus,
  type IntakeCardContext,
  type IntakeCardNeighbor,
  type IntakeNewCollectionInput,
  type IntakeReviewCardPage,
  type IntakePayoutMethod,
  type OrgPricing,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  collections,
  games,
  intakeLots,
} from "../db/schema";
import { collectionNameTaken } from "../routes/collections/shared";
import { getUserDisplayName } from "../middleware/auth";
import {
  cardWithStoredPricesSql,
  scannedCardPriceSql,
} from "./card-price-sql";
import type { IntakeLotRow } from "./interfaces/business";

export async function findOpenIntakeLotId(
  tx: Transaction,
  collectionId: number,
): Promise<number | null> {
  const lot = await tx.query.intakeLots.findFirst({
    where: and(
      eq(intakeLots.collectionId, collectionId),
      eq(intakeLots.status, "open"),
      eq(intakeLots.isDeleted, false),
    ),
    columns: { id: true },
  });
  return lot?.id ?? null;
}

async function uniqueCollectionName(
  tx: Transaction,
  orgId: string,
  base: string,
): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const name = attempt === 1 ? base : `${base} (${attempt})`;
    if (!(await collectionNameTaken(tx, orgId, name))) return name;
  }
}

export async function createIntakeCollection(
  tx: Transaction,
  orgId: string,
  customerName: string,
  input: IntakeNewCollectionInput,
): Promise<{ id: number; name: string } | null> {
  const game = await tx.query.games.findFirst({
    where: and(
      eq(games.guid, input.gameGuid),
      eq(games.isDeleted, false),
      eq(games.isActive, true),
    ),
    columns: { id: true },
  });
  if (!game) return null;
  const name = await uniqueCollectionName(
    tx,
    orgId,
    `${INTAKE_COLLECTION_NAME_PREFIX} ${customerName}`
      .slice(0, SET_NAME_MAX_LENGTH - INTAKE_COLLECTION_NAME_SUFFIX_ROOM)
      .trim(),
  );
  const [created] = await tx
    .insert(collections)
    .values({ name, orgId, gameId: game.id, lang: input.lang, isActive: false })
    .returning({ id: collections.id, name: collections.name });
  return created;
}

export async function retireIntakeCollection(
  tx: Transaction,
  orgId: string,
  collectionId: number,
): Promise<void> {
  const [remaining] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionCards)
    .where(eq(collectionCards.collectionId, collectionId));
  if (Number(remaining?.count ?? 0) > 0) return;
  const [retired] = await tx
    .update(collections)
    .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
    .where(and(eq(collections.id, collectionId), eq(collections.orgId, orgId)))
    .returning({ id: collections.id });
  if (!retired) return;
  const stillActive = await tx.query.collections.findFirst({
    where: and(
      eq(collections.orgId, orgId),
      eq(collections.isActive, true),
      eq(collections.isDeleted, false),
    ),
    columns: { id: true },
  });
  if (stillActive) return;
  const next = await tx.query.collections.findFirst({
    where: and(eq(collections.orgId, orgId), eq(collections.isDeleted, false)),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
    columns: { id: true },
  });
  if (next) {
    await tx
      .update(collections)
      .set({ isActive: true })
      .where(eq(collections.id, next.id));
  }
}

export function selectIntakeLots(tx: Transaction) {
  return tx
    .select({
      id: intakeLots.id,
      guid: intakeLots.guid,
      collectionId: intakeLots.collectionId,
      ownsCollection: intakeLots.ownsCollection,
      customerName: intakeLots.customerName,
      customerContact: intakeLots.customerContact,
      notes: intakeLots.notes,
      status: intakeLots.status,
      payoutMethod: intakeLots.payoutMethod,
      marketTotal: intakeLots.marketTotal,
      cashOffer: intakeLots.cashOffer,
      creditOffer: intakeLots.creditOffer,
      paidTotal: intakeLots.paidTotal,
      cardCount: intakeLots.cardCount,
      createdByUserId: intakeLots.createdByUserId,
      closedByUserId: intakeLots.closedByUserId,
      acceptedAt: intakeLots.acceptedAt,
      closedAt: intakeLots.closedAt,
      createdAt: intakeLots.createdAt,
      collectionGuid: collections.guid,
      collectionName: collections.name,
      collectionDeleted: collections.isDeleted,
      collectionGameGuid: games.guid,
    })
    .from(intakeLots)
    .innerJoin(collections, eq(collections.id, intakeLots.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId));
}

export async function findIntakeLot(
  tx: Transaction,
  orgId: string,
  guid: string,
): Promise<IntakeLotRow | null> {
  const [row] = await selectIntakeLots(tx)
    .where(
      and(
        eq(intakeLots.guid, guid),
        eq(intakeLots.orgId, orgId),
        eq(intakeLots.isDeleted, false),
      ),
    )
    .limit(1);
  return row ?? null;
}

export function intakeLotCardsWhere(lotId: number, ...conditions: SQL[]) {
  return and(
    eq(collectionCards.intakeLotId, lotId),
    eq(collections.isDeleted, false),
    ...conditions,
  );
}

export async function loadIntakeLotCards(
  tx: Transaction,
  lotId: number,
  pricing: OrgPricing,
  buylist: BuylistConfig,
): Promise<IntakeLotCard[]> {
  const rows = await tx
    .select({
      scanId: collectionCards.guid,
      card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      condition: collectionCards.condition,
      scannedAt: collectionCards.scannedAt,
      price: scannedCardPriceSql(pricing),
      acquisitionCost: collectionCards.acquisitionCost,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(intakeLotCardsWhere(lotId))
    .orderBy(desc(collectionCards.scannedAt), desc(collectionCards.id));
  return rows.map((r) => {
    const marketPrice =
      r.price === null ? null : roundCurrency(Number(r.price));
    return {
      scanId: r.scanId!,
      card: r.card,
      isFoil: r.isFoil,
      foilType: r.foilType,
      condition: toCardCondition(r.condition),
      scannedAt: r.scannedAt.toISOString(),
      marketPrice,
      offer: buylistOfferFor(marketPrice, buylist),
      acquisitionCost: r.acquisitionCost,
      belowMinimum: isBelowBuylistMinimum(marketPrice, buylist),
    };
  });
}

export function summarizeIntakeCards(
  cards: Pick<IntakeLotCard, "marketPrice" | "offer">[],
  buylist: BuylistConfig,
) {
  const marketTotal = roundCurrency(
    cards.reduce((sum, card) => sum + (card.marketPrice ?? 0), 0),
  );
  const cashOffer = roundCurrency(
    cards.reduce((sum, card) => sum + (card.offer ?? 0), 0),
  );
  return {
    cardCount: cards.length,
    marketTotal,
    cashOffer,
    creditOffer: creditOfferFor(cashOffer, buylist),
  };
}

async function displayName(userId: string | null): Promise<string | null> {
  return userId ? getUserDisplayName(userId) : null;
}

export async function toIntakeLot(
  row: IntakeLotRow,
  live: ReturnType<typeof summarizeIntakeCards> | null,
  canViewCosts: boolean,
): Promise<IntakeLot> {
  const money = (value: number | null | undefined) =>
    canViewCosts ? (value ?? null) : null;
  return {
    guid: row.guid!,
    customerName: row.customerName,
    customerContact: row.customerContact,
    notes: row.notes,
    status: row.status as IntakeLotStatus,
    payoutMethod: row.payoutMethod as IntakePayoutMethod | null,
    collectionGuid: row.collectionGuid!,
    collectionName: row.collectionName,
    collectionGameGuid: row.collectionGameGuid,
    collectionDeleted: row.collectionDeleted,
    ownsCollection: row.ownsCollection,
    cardCount: live?.cardCount ?? row.cardCount ?? 0,
    marketTotal: money(live?.marketTotal ?? row.marketTotal),
    cashOffer: money(live?.cashOffer ?? row.cashOffer),
    creditOffer: money(live?.creditOffer ?? row.creditOffer),
    paidTotal: money(row.paidTotal),
    createdAt: row.createdAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdByName: await displayName(row.createdByUserId),
    closedByName: await displayName(row.closedByUserId),
  };
}

const lotCardKey = sql`(${collectionCards.scannedAt}, ${collectionCards.id})`;

function lotCardKeyOf(scanId: string): SQL {
  return sql`(SELECT cc2.scanned_at, cc2.id FROM collection_cards cc2 WHERE cc2.guid = ${scanId}::uuid)`;
}

function lotReviewScope(lotId: number, ...conditions: (SQL | undefined)[]) {
  return and(
    eq(collectionCards.intakeLotId, lotId),
    eq(collections.isDeleted, false),
    ...conditions,
  );
}

function selectLotReviewCards(tx: Transaction) {
  return tx
    .select({
      scanId: collectionCards.guid,
      collectionGuid: collections.guid,
      collectionName: collections.name,
      card: sql<PlayingCardWithDistance>`${cardWithStoredPricesSql(sql`(${collectionCards.card} - 'raw')`)}`,
      isFoil: collectionCards.isFoil,
      foilType: collectionCards.foilType,
      condition: collectionCards.condition,
      language: collectionCards.language,
      lowConfidenceMatch: collectionCards.lowConfidenceMatch,
      hasAlternatives: sql<boolean>`(${collectionCards.alternativeMatches} IS NOT NULL AND ${collectionCards.alternativeMatches} <> '[]'::jsonb)`,
      corrected: collectionCards.isCorrected,
      reviewed: collectionCards.isReviewed,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId));
}

async function countLotCards(
  tx: Transaction,
  lotId: number,
  ...conditions: (SQL | undefined)[]
): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(lotReviewScope(lotId, ...conditions));
  return Number(row?.count ?? 0);
}

async function findLotNeighbor(
  tx: Transaction,
  lotId: number,
  scanId: string,
  direction: "previous" | "next",
  unreviewedOnly: boolean,
): Promise<IntakeCardNeighbor | null> {
  const isPrevious = direction === "previous";
  const [row] = await tx
    .select({ scanId: collectionCards.guid, collectionGuid: collections.guid })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(
      lotReviewScope(
        lotId,
        isPrevious
          ? sql`${lotCardKey} > ${lotCardKeyOf(scanId)}`
          : sql`${lotCardKey} < ${lotCardKeyOf(scanId)}`,
        unreviewedOnly ? eq(collectionCards.isReviewed, false) : undefined,
      ),
    )
    .orderBy(
      ...(isPrevious
        ? [asc(collectionCards.scannedAt), asc(collectionCards.id)]
        : [desc(collectionCards.scannedAt), desc(collectionCards.id)]),
    )
    .limit(1);
  return row?.scanId && row.collectionGuid
    ? { scanId: row.scanId, collectionGuid: row.collectionGuid }
    : null;
}

export async function loadIntakeCardContext(
  tx: Transaction,
  lotId: number,
  scanId: string,
  unreviewedOnly: boolean,
): Promise<IntakeCardContext | null> {
  const [current] = await selectLotReviewCards(tx)
    .where(lotReviewScope(lotId, eq(collectionCards.guid, scanId)))
    .limit(1);
  if (!current) return null;
  return {
    card: {
      ...current,
      scanId: current.scanId!,
      collectionGuid: current.collectionGuid!,
      condition: toCardCondition(current.condition),
    },
    index: await countLotCards(
      tx,
      lotId,
      sql`${lotCardKey} > ${lotCardKeyOf(scanId)}`,
    ),
    total: await countLotCards(tx, lotId),
    previous: await findLotNeighbor(tx, lotId, scanId, "previous", unreviewedOnly),
    next: await findLotNeighbor(tx, lotId, scanId, "next", unreviewedOnly),
  };
}

export async function loadUnreviewedLotCards(
  tx: Transaction,
  lotId: number,
): Promise<IntakeReviewCardPage> {
  const unreviewed = eq(collectionCards.isReviewed, false);
  const rows = await selectLotReviewCards(tx)
    .where(lotReviewScope(lotId, unreviewed))
    .orderBy(desc(collectionCards.scannedAt), desc(collectionCards.id))
    .limit(REVIEW_GRID_CARD_LIMIT);
  return {
    cards: rows.map((row) => ({
      ...row,
      scanId: row.scanId!,
      collectionGuid: row.collectionGuid!,
      condition: toCardCondition(row.condition),
    })),
    total: await countLotCards(tx, lotId, unreviewed),
  };
}

export async function findNextUnreviewedLotCard(
  tx: Transaction,
  lotId: number,
): Promise<string | null> {
  const [row] = await tx
    .select({ scanId: collectionCards.guid })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(lotReviewScope(lotId, eq(collectionCards.isReviewed, false)))
    .orderBy(desc(collectionCards.scannedAt), desc(collectionCards.id))
    .limit(1);
  return row?.scanId ?? null;
}
