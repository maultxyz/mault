import type {
  BinConfig,
  BinRuleGroup,
  EmptyBinOptions,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
import {
  isStorageAllowed,
  STORAGE_UPGRADE_MESSAGE,
} from "../../lib/storage-access";
import { assignBinToLocation } from "../../lib/storage-locations";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resolveGameId } from "./shared";

// Marks a physical bin as emptied - cards scanned before now stop counting
// toward its cardLimit, without touching the collection's card history.
export const emptyBinRoute = new Hono<AppEnv>().post(
  "/bins/:binNumber/empty",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const binNumber = parseInt(c.req.param("binNumber"));
    const gameGuid = c.req.query("gameGuid");
    const { locationGuid, collectionGuid } = await c.req
      .json<EmptyBinOptions>()
      .catch((): EmptyBinOptions => ({}));
    if (locationGuid && !collectionGuid) {
      return c.json(
        { success: false, message: "A collection is required." },
        400,
      );
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await resolveGameId(tx, gameGuid);
        const activeBinSet = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and, isNull }) =>
            gameId === null
              ? and(
                  eq(binSets.isActive, true),
                  isNull(binSets.gameId),
                  eq(binSets.orgId, orgId),
                  eq(binSets.isDeleted, false),
                )
              : and(
                  eq(binSets.isActive, true),
                  eq(binSets.gameId, gameId),
                  eq(binSets.orgId, orgId),
                  eq(binSets.isDeleted, false),
                ),
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

        const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
        if (!existing) return { message: "Bin not found.", success: false };

        let assignedCount = 0;
        if (locationGuid && collectionGuid) {
          if (!(await isStorageAllowed(tx, orgId))) {
            return {
              message: STORAGE_UPGRADE_MESSAGE,
              success: false,
              upgradeRequired: true,
            };
          }
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
            return { message: "Storage location not found.", success: false };
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
            return { message: "Collection not found.", success: false };
          }
          assignedCount = await assignBinToLocation(tx, {
            binId: existing.id,
            binNumber,
            collectionId: collection.id,
            locationId: location.id,
          });
        }

        await tx
          .update(bins)
          .set({ lastEmptiedAt: new Date(), updatedAt: new Date() })
          .where(eq(bins.id, existing.id));

        const updatedBins = await tx.query.bins.findMany({
          where: (t, { eq, and }) =>
            and(eq(t.binSet, activeBinSet.id), eq(t.isDeleted, false)),
          columns: {
            guid: true,
            binNumber: true,
            rules: true,
            isCatchAll: true,
            isOverride: true,
            cardLimit: true,
            maxCopies: true,
            isDisabled: true,
            lastEmptiedAt: true,
          },
        });

        return {
          message: "Bin marked as emptied.",
          success: true,
          assignedCount,
          data: updatedBins.map(
            (b): BinConfig => ({
              guid: b.guid!,
              binNumber: b.binNumber,
              rules: b.rules as BinRuleGroup,
              isCatchAll: b.isCatchAll,
              isOverride: b.isOverride,
              cardLimit: b.cardLimit,
              maxCopies: b.maxCopies,
              isDisabled: b.isDisabled,
              lastEmptiedAt: b.lastEmptiedAt ? b.lastEmptiedAt.getTime() : null,
            }),
          ),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
