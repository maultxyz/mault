import type { EmptyAllBinsInput } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, storageLocations } from "../../db/schema";
import { UUID_PATTERN } from "../../lib/constants/validation";
import {
  isStorageAllowed,
  STORAGE_UPGRADE_MESSAGE,
} from "../../lib/storage-access";
import { assignBinToLocation } from "../../lib/storage-locations";
import { emitCardsStoredWebhook } from "../../lib/webhooks/events";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  activeBinSetWhere,
  emptyRules,
  loadSets,
  resolveGameId,
} from "./shared";

export const emptyAllBinsRoute = new Hono<AppEnv>().post(
  "/bins/empty-all",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const gameGuid = c.req.query("gameGuid");
    const {
      binNumbers = [],
      collectionGuid,
      locations = [],
    } = await c.req
      .json<Partial<EmptyAllBinsInput>>()
      .catch((): Partial<EmptyAllBinsInput> => ({}));
    if (
      !Array.isArray(binNumbers) ||
      binNumbers.some((n) => !Number.isInteger(n) || n < 1)
    ) {
      return c.json({ success: false, message: "Invalid bin numbers." }, 400);
    }
    if (
      !Array.isArray(locations) ||
      locations.some(
        (l) =>
          !Number.isInteger(l?.binNumber) ||
          typeof l?.locationGuid !== "string" ||
          !UUID_PATTERN.test(l.locationGuid),
      )
    ) {
      return c.json({ success: false, message: "Invalid locations." }, 400);
    }
    if (locations.length > 0 && !collectionGuid) {
      return c.json(
        { success: false, message: "A collection is required." },
        400,
      );
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await resolveGameId(tx, gameGuid);
        const activeBinSet = await tx.query.binSets.findFirst({
          where: (t) => activeBinSetWhere(t, orgId, gameId),
          columns: { id: true },
          with: {
            bins: {
              where: (bin, { eq }) => eq(bin.isDeleted, false),
              columns: { id: true, binNumber: true },
            },
          },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };

        const binIds = new Map(
          activeBinSet.bins.map((b) => [b.binNumber, b.id]),
        );
        const missing = [
          ...new Set([...binNumbers, ...locations.map((l) => l.binNumber)]),
        ].filter((n) => !binIds.has(n));
        if (missing.length > 0) {
          const inserted = await tx
            .insert(bins)
            .values(
              missing.map((binNumber) => ({
                binNumber,
                rules: emptyRules(),
                binSet: activeBinSet.id,
                orgId,
              })),
            )
            .returning({ id: bins.id, binNumber: bins.binNumber });
          for (const bin of inserted) binIds.set(bin.binNumber, bin.id);
        }

        const stored = new Map<string, string[]>();
        if (locations.length > 0) {
          if (!(await isStorageAllowed(tx, orgId))) {
            return {
              message: STORAGE_UPGRADE_MESSAGE,
              success: false,
              upgradeRequired: true,
            };
          }
          const collection = await tx.query.collections.findFirst({
            where: (t, { eq, and }) =>
              and(
                eq(t.guid, collectionGuid!),
                eq(t.orgId, orgId),
                eq(t.isDeleted, false),
              ),
            columns: { id: true },
          });
          if (!collection) {
            return { message: "Collection not found.", success: false };
          }
          const locationIds = new Map<string, number>();
          for (const { binNumber, locationGuid } of locations) {
            let locationId = locationIds.get(locationGuid);
            if (locationId === undefined) {
              const location = await tx.query.storageLocations.findFirst({
                where: (t, { eq, and }) =>
                  and(
                    eq(t.guid, locationGuid),
                    eq(t.orgId, orgId),
                    eq(t.isDeleted, false),
                  ),
                columns: { id: true },
              });
              if (!location) {
                return {
                  message: "Storage location not found.",
                  success: false,
                };
              }
              locationId = location.id;
              locationIds.set(locationGuid, locationId);
            }
            const scanIds = await assignBinToLocation(tx, {
              binId: binIds.get(binNumber)!,
              binNumber,
              collectionId: collection.id,
              locationId,
            });
            stored.set(locationGuid, [
              ...(stored.get(locationGuid) ?? []),
              ...scanIds,
            ]);
          }
          const now = new Date();
          for (const locationId of locationIds.values()) {
            await tx
              .update(storageLocations)
              .set({ lastUsedAt: now })
              .where(eq(storageLocations.id, locationId));
          }
        }

        const now = new Date();
        await tx
          .update(bins)
          .set({ lastEmptiedAt: now, updatedAt: now })
          .where(
            and(eq(bins.binSet, activeBinSet.id), eq(bins.isDeleted, false)),
          );

        const sets = await loadSets(tx, orgId);
        return {
          ...sets,
          assignedCount: [...stored.values()].reduce(
            (sum, ids) => sum + ids.length,
            0,
          ),
          stored,
        };
      });
      if (result.success && "stored" in result) {
        const { stored, ...body } = result;
        for (const [locationGuid, scanIds] of stored) {
          emitCardsStoredWebhook(orgId, locationGuid, scanIds);
        }
        return c.json(body);
      }
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
