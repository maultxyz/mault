import type {
  Collection,
  FieldMeta,
  PhoneCameraMessage,
  PlayingCardWithDistance,
  ScannedCard,
} from "@magic-vault/shared";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authProvider } from "../auth";
import { authQuery, db, type Transaction } from "../db";
import {
  collectionCards,
  collections,
  games,
  orgBilling,
  orgSettings,
} from "../db/schema";
import {
  buildCardScannedEmbed,
  buildScanSessionStartEmbed,
  buildSortingLogicSummary,
  sendDiscordNotification,
} from "../lib/discord";
import {
  acquireLock,
  getLocksForGuids,
  releaseLock,
  subscribeOrgLocks,
} from "../lib/scan-lock";
import {
  emitToOrg,
  emitToSession,
  getAllSessionViewers,
  getLiveCountsForGuids,
  getSessionViewers,
  subscribeOrgLiveCounts,
  subscribeSession,
} from "../lib/session-stream";
import { FREE_PLAN_DAILY_SCAN_LIMIT, isBillingEnabled } from "../lib/stripe";
import {
  getUserDisplayName,
  requireAuth,
  requireOrg,
  verifyToken,
  type AppEnv,
} from "../middleware/auth";

const router = new Hono<AppEnv>();

function toCollection(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  cardCount: string | number;
  lang: string;
  createdAt: Date;
  updatedAt: Date;
  gameGuid: string | null;
  gameKey: string | null;
  gameName: string | null;
  gameIsActive: boolean | null;
  gameFieldDefinitions: unknown;
  gameApiDocsUrl: string | null;
  gameCreatedAt: Date | null;
  gameUpdatedAt: Date | null;
}): Collection {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    cardCount: Number(row.cardCount),
    lang: row.lang,
    game: row.gameGuid
      ? {
          guid: row.gameGuid,
          key: row.gameKey!,
          name: row.gameName!,
          isActive: row.gameIsActive!,
          fieldDefinitions: row.gameFieldDefinitions as FieldMeta[],
          apiDocsUrl: row.gameApiDocsUrl,
          createdAt: row.gameCreatedAt!,
          updatedAt: row.gameUpdatedAt!,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toScannedCard(row: {
  guid: string | null;
  card: unknown;
  scannedAt: Date;
  binNumber: number | null;
  capturedImageDataUrl?: string | null;
  isFoil?: boolean | null;
  isDownloaded?: boolean | null;
  alternativeMatches?: unknown;
}): ScannedCard {
  return {
    scanId: row.guid!,
    card: row.card as PlayingCardWithDistance,
    scannedAt: row.scannedAt.getTime(),
    binNumber: row.binNumber ?? undefined,
    capturedImageUrl: row.capturedImageDataUrl ?? undefined,
    isFoil: row.isFoil ?? undefined,
    isDownloaded: row.isDownloaded ?? undefined,
    alternativeMatches:
      (row.alternativeMatches as PlayingCardWithDistance[] | null) ?? undefined,
  };
}

async function _loadCollections(
  tx: Transaction,
  orgId: string,
): Promise<{ success: true; data: Collection[] }> {
  const rows = await tx
    .select({
      id: collections.id,
      guid: collections.guid,
      name: collections.name,
      isActive: collections.isActive,
      cardCount: count(collectionCards.id),
      lang: collections.lang,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      gameGuid: games.guid,
      gameKey: games.key,
      gameName: games.name,
      gameIsActive: games.isActive,
      gameFieldDefinitions: games.fieldDefinitions,
      gameApiDocsUrl: games.apiDocsUrl,
      gameCreatedAt: games.createdAt,
      gameUpdatedAt: games.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(eq(collections.orgId, orgId))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.isActive,
      collections.lang,
      collections.createdAt,
      collections.updatedAt,
      games.id,
    )
    .orderBy(desc(collections.updatedAt));

  return { success: true, data: rows.map(toCollection) };
}

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), (tx) =>
      _loadCollections(tx, orgId),
    );
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/lock-events — SSE stream of lock_acquired / lock_released for all org collections
router.get("/lock-events", async (c) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  if (!member) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const unsubscribe = subscribeOrgLocks(orgId, (event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    try {
      const guids = await authQuery(jwtClaims, async (tx) =>
        tx
          .select({ guid: collections.guid })
          .from(collections)
          .where(eq(collections.orgId, orgId)),
      );
      const initial = getLocksForGuids(
        guids.map((r) => r.guid!).filter(Boolean),
      );
      await stream.writeSSE({
        event: "init",
        data: JSON.stringify({ locks: initial }),
      });
    } catch {}

    await aborted;
    unsubscribe();
  });
});

// GET /collections/locks — returns { [guid]: ScanLock } for collections currently locked by a scanner
router.get("/locks", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const guids = await authQuery(c.get("jwtClaims"), async (tx) =>
      tx
        .select({ guid: collections.guid })
        .from(collections)
        .where(eq(collections.orgId, orgId)),
    );
    const data = getLocksForGuids(guids.map((r) => r.guid!).filter(Boolean));
    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/live-events — SSE stream of live viewer-count changes for all org collections
router.get("/live-events", async (c) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  if (!member) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const unsubscribe = subscribeOrgLiveCounts(orgId, (event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    try {
      const guids = await authQuery(jwtClaims, async (tx) =>
        tx
          .select({ guid: collections.guid })
          .from(collections)
          .where(eq(collections.orgId, orgId)),
      );
      const initial = getLiveCountsForGuids(
        guids.map((r) => r.guid!).filter(Boolean),
      );
      await stream.writeSSE({
        event: "init",
        data: JSON.stringify({
          counts: initial,
          viewers: getAllSessionViewers(),
        }),
      });
    } catch {}

    await aborted;
    unsubscribe();
  });
});

// POST /collections — create and activate
router.post("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name, gameGuid, lang } = await c.req.json<{
    name: string;
    gameGuid?: string;
    lang?: string;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      let gameId: number | null = null;
      if (gameGuid) {
        const game = await tx.query.games.findFirst({
          where: (t, { eq }) => eq(t.guid, gameGuid),
          columns: { id: true },
        });
        gameId = game?.id ?? null;
      }

      await tx
        .update(collections)
        .set({ isActive: false })
        .where(
          and(eq(collections.isActive, true), eq(collections.orgId, orgId)),
        );

      await tx
        .insert(collections)
        .values({ name, isActive: true, orgId, gameId, lang: lang || "en" });

      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", {});
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!target) return { success: false, message: "Collection not found." };
      await tx
        .update(collections)
        .set({ name, updatedAt: new Date() })
        .where(eq(collections.id, target.id));
      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid/active", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!target) return { success: false, message: "Collection not found." };

      await tx
        .update(collections)
        .set({ isActive: false })
        .where(
          and(eq(collections.isActive, true), eq(collections.orgId, orgId)),
        );
      await tx
        .update(collections)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(collections.id, target.id));

      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true, isActive: true },
      });
      if (!target) return { success: false, message: "Collection not found." };

      // cascade deletes collectionCards via FK
      await tx.delete(collections).where(eq(collections.id, target.id));

      // if we deleted the active one, activate the most recent remaining
      if (target.isActive) {
        const next = await tx.query.collections.findFirst({
          where: (t, { eq }) => eq(t.orgId, orgId),
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

      return _loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.get("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!collection)
        return { success: false, message: "Collection not found." };

      const rows = await tx
        .select({
          guid: collectionCards.guid,
          card: collectionCards.card,
          scannedAt: collectionCards.scannedAt,
          binNumber: collectionCards.binNumber,
          isFoil: collectionCards.isFoil,
          isDownloaded: collectionCards.isDownloaded,
          alternativeMatches: collectionCards.alternativeMatches,
        })
        .from(collectionCards)
        .where(eq(collectionCards.collectionId, collection.id))
        .orderBy(desc(collectionCards.scannedAt));

      return { success: true, data: rows.map(toScannedCard) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const {
    scanId,
    card,
    scannedAt,
    binNumber,
    capturedImageUrl,
    isFoil,
    alternativeMatches,
  } = await c.req.json<ScannedCard>();

  const displayName = await getUserDisplayName(userId);
  const { ok: lockOk, isNewSession } = acquireLock(
    guid,
    userId,
    orgId,
    displayName,
  );
  if (!lockOk) {
    return c.json(
      {
        success: false,
        message:
          "Another org member is currently scanning into this collection.",
      },
      423,
    );
  }

  type AddCardResult =
    | { success: true; data: ScannedCard }
    | { success: false; message: string; scanLimitReached?: boolean };

  try {
    const { result, collectionName, gameName, gameId } = await authQuery<{
      result: AddCardResult;
      collectionName: string | undefined;
      gameName: string | undefined;
      gameId: number | null;
    }>(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true, gameId: true, name: true },
      });
      if (!collection)
        return {
          result: { success: false, message: "Collection not found." },
          collectionName: undefined,
          gameName: undefined,
          gameId: null,
        };

      if (isBillingEnabled()) {
        const billing = await tx.query.orgBilling.findFirst({
          where: eq(orgBilling.orgId, orgId),
          columns: { plan: true },
        });
        if ((billing?.plan ?? "free") === "free") {
          const startOfTodayUtc = new Date();
          startOfTodayUtc.setUTCHours(0, 0, 0, 0);
          const [{ scannedToday }] = await tx
            .select({ scannedToday: sql<number>`count(*)::int` })
            .from(collectionCards)
            .where(
              and(
                eq(collectionCards.orgId, orgId),
                gte(collectionCards.scannedAt, startOfTodayUtc),
              ),
            );
          if (scannedToday >= FREE_PLAN_DAILY_SCAN_LIMIT) {
            return {
              result: {
                success: false,
                message: `Free plan daily scan limit reached (${FREE_PLAN_DAILY_SCAN_LIMIT}/day). Upgrade to Business for unlimited scanning.`,
                scanLimitReached: true,
              },
              collectionName: undefined,
              gameName: undefined,
              gameId: null,
            };
          }
        }
      }

      await tx
        .insert(collectionCards)
        .values({
          guid: scanId,
          collectionId: collection.id,
          cardId: (card as PlayingCardWithDistance).id,
          card,
          scannedAt: new Date(scannedAt),
          binNumber: binNumber ?? null,
          capturedImageDataUrl: capturedImageUrl ?? null,
          isFoil: isFoil ?? false,
          alternativeMatches: alternativeMatches?.length
            ? alternativeMatches
            : null,
          orgId,
        })
        .onConflictDoNothing();

      await tx
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collection.id));

      const game = collection.gameId
        ? await tx.query.games.findFirst({
            where: (t, { eq }) => eq(t.id, collection.gameId!),
            columns: { name: true },
          })
        : null;

      return {
        result: {
          success: true,
          data: {
            scanId,
            card,
            scannedAt,
            binNumber,
            capturedImageUrl,
            isFoil,
            alternativeMatches,
          } as ScannedCard,
        },
        collectionName: collection.name,
        gameName: game?.name,
        gameId: collection.gameId,
      };
    });
    if (result.success) {
      emitToSession(guid, "card_added", result.data);
      emitToOrg(orgId, "collections_changed", { guid });

      db.query.orgSettings
        .findFirst({
          where: eq(orgSettings.orgId, orgId),
          columns: { discordNotifyOnScan: true },
        })
        .then(async (row) => {
          if (!row?.discordNotifyOnScan) return;

          if (isNewSession) {
            const sortingLogicSummary = await buildSortingLogicSummary(
              orgId,
              gameId,
            );
            await sendDiscordNotification(
              orgId,
              buildScanSessionStartEmbed(
                collectionName ?? "Unknown collection",
                sortingLogicSummary,
              ),
              "scan",
              undefined,
              undefined,
              guid,
            );
          }

          const { embed, referenceImageUrl } = buildCardScannedEmbed(
            card as PlayingCardWithDistance,
            {
              isFoil,
              collectionName,
              gameName,
              collectionGuid: guid,
              capturedImageDataUrl: capturedImageUrl,
            },
          );
          void sendDiscordNotification(
            orgId,
            embed,
            "scan",
            capturedImageUrl,
            referenceImageUrl,
            guid,
          );
        })
        .catch((err) => {
          console.error("[discord] Failed to check discordNotifyOnScan:", err);
        });
    }
    if (!result.success && result.scanLimitReached) {
      return c.json(result, 402);
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    emitToSession(guid, "scan_error", {
      message: "Failed to save card to collection.",
      timestamp: Date.now(),
    });
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /collections/:guid/cards/:scanId/image — the scanned photo, fetched on
// demand for the card detail view only; the bulk card list/session_init
// payloads omit it since it's stored inline as a base64 data URL and
// including it for every card in a collection's history blows up the
// response size.
router.get(
  "/:guid/cards/:scanId/image",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.collectionCards.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
          columns: { capturedImageDataUrl: true },
        });
        if (!existing) return { success: false, message: "Card not found." };
        return {
          success: true,
          data: { capturedImageUrl: existing.capturedImageDataUrl ?? undefined },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

// PUT /collections/:guid/cards/:scanId — update card (correction and/or foil status)
router.put("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { guid, scanId } = c.req.param();
  const { card, binNumber, isFoil } = await c.req.json<{
    card?: PlayingCardWithDistance;
    binNumber?: number;
    isFoil?: boolean;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.collectionCards.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
        columns: {
          id: true,
          scannedAt: true,
          card: true,
          binNumber: true,
          isFoil: true,
        },
      });
      if (!existing) return { success: false, message: "Card not found." };

      const updates: Partial<typeof collectionCards.$inferInsert> = {};
      if (card !== undefined) {
        updates.card = card;
        updates.cardId = card.id;
        updates.binNumber = binNumber ?? null;
      }
      if (isFoil !== undefined) updates.isFoil = isFoil;

      await tx
        .update(collectionCards)
        .set(updates)
        .where(eq(collectionCards.id, existing.id));

      return {
        success: true,
        data: toScannedCard({
          guid: scanId,
          card: (card ?? existing.card) as PlayingCardWithDistance,
          scannedAt: existing.scannedAt,
          binNumber:
            card !== undefined ? (binNumber ?? null) : existing.binNumber,
          isFoil: isFoil !== undefined ? isFoil : existing.isFoil,
        }),
      };
    });
    if (result.success) emitToSession(guid, "card_updated", result.data);
    return c.json(result);
  } catch (err) {
    console.error(err);
    emitToSession(guid, "scan_error", {
      message: "Failed to update card.",
      timestamp: Date.now(),
    });
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid/cards", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        columns: { id: true },
      });
      if (!collection)
        return { success: false, message: "Collection not found." };

      await tx
        .delete(collectionCards)
        .where(eq(collectionCards.collectionId, collection.id));

      return { success: true, data: null };
    });
    if (result.success) {
      emitToSession(guid, "cards_cleared", {});
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/:guid/cards/remove-bulk", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  const { scanIds } = await c.req.json<{ scanIds: string[] }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      for (const scanId of scanIds) {
        await tx
          .delete(collectionCards)
          .where(
            and(
              eq(collectionCards.guid, scanId),
              eq(collectionCards.orgId, orgId),
            ),
          );
      }
      return { success: true, data: null };
    });
    if (result.success) {
      emitToSession(guid, "cards_removed", { scanIds });
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post(
  "/:guid/cards/mark-downloaded",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanIds } = await c.req.json<{ scanIds: string[] }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        for (const scanId of scanIds) {
          await tx
            .update(collectionCards)
            .set({ isDownloaded: true })
            .where(
              and(
                eq(collectionCards.guid, scanId),
                eq(collectionCards.orgId, orgId),
              ),
            );
        }
        return { success: true, data: null };
      });
      if (result.success) emitToSession(guid, "cards_downloaded", { scanIds });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

router.delete("/:guid/cards/:scanId", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { guid, scanId } = c.req.param();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .delete(collectionCards)
        .where(
          and(
            eq(collectionCards.guid, scanId),
            eq(collectionCards.orgId, orgId),
          ),
        );
      return { success: true, data: null };
    });
    if (result.success) {
      emitToSession(guid, "card_removed", { scanId });
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid/scan-lock", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const userId = c.get("userId");
  releaseLock(guid, userId); // emits lock_released to org subscribers internally
  return c.json({ success: true, data: null });
});

// POST /collections/:guid/debug/error — emit a test scan_error to session watchers (admin only)
router.post("/:guid/debug/error", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  emitToSession(guid, "scan_error", {
    message: "Debug: forced error triggered.",
    timestamp: Date.now(),
  });
  return c.json({ success: true, data: null });
});

// POST /collections/:guid/phone-camera-signal — relays presence/capture
// messages between a desktop scanner session and a phone paired as its
// camera. Both sides are already subscribed to this collection's /stream
// SSE below; this just fans a message out to them. No WebRTC - the "photo"
// case carries the actual captured image as a data URL, same as how
// scanned cards already store capturedImageDataUrl.
router.post(
  "/:guid/phone-camera-signal",
  requireAuth,
  requireOrg,
  async (c) => {
    const guid = c.req.param("guid");
    const message = await c.req.json<PhoneCameraMessage>();
    emitToSession(guid, "phone_camera_message", message);
    return c.json({ success: true, data: null });
  },
);

// GET /collections/:guid/stream — SSE, auth via ?token= and ?orgId= query params
router.get("/:guid/stream", async (c) => {
  const guid = c.req.param("guid");
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  if (!member) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  const viewerDisplayName = await getUserDisplayName(payload.sub);

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const writer = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };

    const unsubscribe = subscribeSession(
      guid,
      orgId,
      payload.sub!,
      viewerDisplayName,
      writer,
    );

    try {
      const initial = await authQuery(jwtClaims, async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: {
            id: true,
            guid: true,
            name: true,
            isActive: true,
            gameId: true,
            lang: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!collection) return null;

        const game = collection.gameId
          ? await tx.query.games.findFirst({
              where: (t, { eq }) => eq(t.id, collection.gameId!),
            })
          : null;

        const cardRows = await tx
          .select({
            guid: collectionCards.guid,
            card: collectionCards.card,
            scannedAt: collectionCards.scannedAt,
            binNumber: collectionCards.binNumber,
            isFoil: collectionCards.isFoil,
            isDownloaded: collectionCards.isDownloaded,
            alternativeMatches: collectionCards.alternativeMatches,
          })
          .from(collectionCards)
          .where(eq(collectionCards.collectionId, collection.id))
          .orderBy(desc(collectionCards.scannedAt));

        return {
          collection: {
            guid: collection.guid!,
            name: collection.name,
            isActive: collection.isActive,
            cardCount: cardRows.length,
            lang: collection.lang,
            game: game
              ? {
                  guid: game.guid!,
                  key: game.key,
                  name: game.name,
                  isActive: game.isActive,
                  fieldDefinitions: game.fieldDefinitions as FieldMeta[],
                  apiDocsUrl: game.apiDocsUrl,
                  createdAt: game.createdAt,
                  updatedAt: game.updatedAt,
                }
              : null,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          } satisfies Collection,
          cards: cardRows.map(toScannedCard),
          viewers: getSessionViewers(guid),
        };
      });

      if (initial) {
        await stream.writeSSE({
          event: "session_init",
          data: JSON.stringify(initial),
        });
      }
    } catch {
      // non-fatal — subscriber will still receive live events
    }

    await aborted;

    unsubscribe();
  });
});

export { router as collectionsRouter };
