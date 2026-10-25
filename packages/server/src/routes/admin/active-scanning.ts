import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import type { ActiveScanSession, ActiveScanningStats } from "@magic-vault/shared";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { collectionCards, collections, games } from "../../db/schema";
import { SCAN_LOCK_TTL_MS } from "../../lib/constants/timing";
import { countConnectedSorters } from "../../lib/device-leases";
import {
  getActiveScanLockStats,
  listActiveScanLocks,
} from "../../lib/scan-lock";
import { countRecentScans } from "../../lib/scan-stats";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const activeScanningRoute = new Hono<AppEnv>()
  .get(
    "/active-scanning",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const data: ActiveScanningStats = {
        ...getActiveScanLockStats(),
        connectedSorters: countConnectedSorters(),
        recentScans: await countRecentScans(SCAN_LOCK_TTL_MS),
        windowMinutes: Math.round(SCAN_LOCK_TTL_MS / 60_000),
      };
      return c.json({ success: true, data });
    },
  )
  .get(
    "/active-scanning/sessions",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const locks = listActiveScanLocks();
      if (locks.length === 0) return c.json({ success: true, data: [] });
      try {
        const rows = await db
          .select({
            id: collections.id,
            guid: collections.guid,
            name: collections.name,
            gameName: games.name,
          })
          .from(collections)
          .leftJoin(games, eq(games.id, collections.gameId))
          .where(
            inArray(
              collections.guid,
              locks.map((lock) => lock.collectionGuid),
            ),
          );
        const byGuid = new Map(rows.map((row) => [row.guid, row]));
        const orgNames = await authProvider.getOrganisationNames([
          ...new Set(locks.map((lock) => lock.orgId)),
        ]);
        const data: ActiveScanSession[] = await Promise.all(
          locks.map(async (lock) => {
            const collection = byGuid.get(lock.collectionGuid);
            const [counted] = collection
              ? await db
                  .select({ count: sql<number>`count(*)::int` })
                  .from(collectionCards)
                  .where(
                    and(
                      eq(collectionCards.collectionId, collection.id),
                      gte(collectionCards.scannedAt, new Date(lock.startedAt)),
                    ),
                  )
              : [];
            return {
              collectionGuid: lock.collectionGuid,
              collectionName: collection?.name ?? null,
              gameName: collection?.gameName ?? null,
              orgId: lock.orgId,
              orgName: orgNames.get(lock.orgId) ?? null,
              userId: lock.userId,
              displayName: lock.displayName,
              startedAt: new Date(lock.startedAt).toISOString(),
              lastActivityAt: new Date(
                lock.expiresAt - SCAN_LOCK_TTL_MS,
              ).toISOString(),
              scansThisSession: counted?.count ?? 0,
            };
          }),
        );
        data.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
        return c.json({ success: true, data });
      } catch (err) {
        return databaseErrorResponse(c, err);
      }
    },
  );
