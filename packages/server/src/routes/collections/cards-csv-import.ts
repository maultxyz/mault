import {
  COLLECTION_CSV_IMPORT_MAX_COPIES,
  COLLECTION_CSV_IMPORT_UNMATCHED_ROWS_MAX,
  collectionCsvImportRequestSchema,
  DEFAULT_CARD_CONDITION,
  pickedCardLanguage,
  type CollectionCsvImportResult,
} from "@magic-vault/shared";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { authQuery } from "../../db";
import { collectionCards, collections, games } from "../../db/schema";
import { findCatalogCardKeys } from "../../lib/card-catalog";
import { resolveCardSearchForGame } from "../../lib/card-search/resolve";
import { searchCardsByIds } from "../../lib/card-search/stored-cards";
import { resolveCollectionCsvRows } from "../../lib/collection-csv-import";
import { COLLECTION_CSV_IMPORT_INSERT_BATCH_SIZE } from "../../lib/constants/collection-csv-import";
import { findOpenIntakeLotId } from "../../lib/intake";
import type { ResolvedCollectionCsvImport } from "../../lib/interfaces/collection-csv-import";
import { savedCardCatalogKeys, slimSavedCardSnapshots } from "../../lib/saved-cards";
import { emitCollectionCardsChanged } from "../../lib/session-stream";
import {
  markRequestAsReadOnly,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

async function resolveImport(
  c: Context<AppEnv>,
): Promise<ResolvedCollectionCsvImport | Response> {
  const parsed = collectionCsvImportRequestSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return c.json({ success: false, message: "Invalid import rows." }, 400);
  }
  const rows = parsed.data.rows;
  const [collection] = await authQuery(c.get("jwtClaims"), (tx) =>
    tx
      .select({ id: collections.id, lang: collections.lang, gameKey: games.key })
      .from(collections)
      .innerJoin(games, eq(games.id, collections.gameId))
      .where(
        and(
          eq(collections.guid, c.req.param("guid") ?? ""),
          eq(collections.orgId, c.get("orgId")),
          eq(collections.isDeleted, false),
        ),
      )
      .limit(1),
  );
  if (!collection) {
    return c.json({ success: false, message: "Collection not found." }, 404);
  }
  const resolved = resolveCardSearchForGame(collection.gameKey, collection.lang);
  if (!resolved) {
    return c.json({ success: false, message: "This game has no card catalog." }, 400);
  }

  const cardIdByLine = await resolveCollectionCsvRows(resolved, rows);
  const cards = await searchCardsByIds(resolved, [...new Set(cardIdByLine.values())]);
  const matched: ResolvedCollectionCsvImport["matched"] = [];
  const unmatchedRows: CollectionCsvImportResult["unmatchedRows"] = [];
  let unmatchedRowCount = 0;
  for (const row of rows) {
    const cardId = cardIdByLine.get(row.lineNumber);
    const card = cardId ? cards.get(cardId) : undefined;
    if (card) {
      matched.push({ row, card });
      continue;
    }
    unmatchedRowCount++;
    if (unmatchedRows.length < COLLECTION_CSV_IMPORT_UNMATCHED_ROWS_MAX) {
      unmatchedRows.push({
        lineNumber: row.lineNumber,
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber,
        quantity: row.quantity,
      });
    }
  }
  const matchedCopies = matched.reduce((sum, { row }) => sum + row.quantity, 0);
  if (matchedCopies > COLLECTION_CSV_IMPORT_MAX_COPIES) {
    return c.json(
      {
        success: false,
        message: `An import can add at most ${COLLECTION_CSV_IMPORT_MAX_COPIES} cards.`,
      },
      400,
    );
  }
  return {
    collectionId: collection.id,
    scope: { gameKey: collection.gameKey, lang: collection.lang },
    matched,
    result: {
      matchedCopies,
      importedCopies: 0,
      unmatchedRowCount,
      unmatchedRows,
    },
  };
}

export const collectionCsvImportRoute = new Hono<AppEnv>()
  .post(
    "/:guid/cards/csv-import/preview",
    requireAuth,
    requireOrg,
    markRequestAsReadOnly,
    async (c) => {
      const resolved = await resolveImport(c);
      if (resolved instanceof Response) return resolved;
      return c.json({ success: true, data: resolved.result });
    },
  )
  .post("/:guid/cards/csv-import", requireAuth, requireOrg, async (c) => {
    const resolved = await resolveImport(c);
    if (resolved instanceof Response) return resolved;
    const { collectionId, scope, matched, result } = resolved;
    if (matched.length === 0) return c.json({ success: true, data: result });

    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const distinctCards = [
      ...new Map(matched.map(({ card }) => [card.id, card])).values(),
    ];
    const inCatalog = await findCatalogCardKeys(
      distinctCards.flatMap((card) => savedCardCatalogKeys(scope, card, null)),
    );
    const snapshotByCardId = new Map(
      distinctCards.map((card) => [
        card.id,
        slimSavedCardSnapshots(scope, card, null, inCatalog).card,
      ]),
    );

    await authQuery(c.get("jwtClaims"), async (tx) => {
      const intakeLotId = await findOpenIntakeLotId(tx, collectionId);
      const scannedAt = new Date();
      const values = matched.flatMap(({ row, card }) => {
        const isFoil = row.isFoil ?? !!card.foilOnlyFoilType;
        return Array.from({ length: row.quantity }, () => ({
          guid: randomUUID(),
          collectionId,
          cardId: card.id,
          card: snapshotByCardId.get(card.id) ?? card,
          scannedAt,
          isFoil,
          foilType: isFoil ? (card.foilOnlyFoilType ?? null) : null,
          condition: row.condition ?? DEFAULT_CARD_CONDITION,
          language: row.language ?? pickedCardLanguage(card),
          isReviewed: true,
          scannedByUserId: userId,
          intakeLotId,
          orgId,
        }));
      });
      for (
        let start = 0;
        start < values.length;
        start += COLLECTION_CSV_IMPORT_INSERT_BATCH_SIZE
      ) {
        await tx
          .insert(collectionCards)
          .values(values.slice(start, start + COLLECTION_CSV_IMPORT_INSERT_BATCH_SIZE));
      }
      await tx
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collectionId));
    });

    emitCollectionCardsChanged(orgId, c.req.param("guid"));
    return c.json({
      success: true,
      data: { ...result, importedCopies: result.matchedCopies },
    });
  });
