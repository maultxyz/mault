import type { EmptyBinOptions } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { storageLocations } from "../../db/schema";
import { markBinsEmptied } from "../../lib/bin-emptying";
import { assignBinToLocation } from "../../lib/storage-locations";
import { reclaimFillLocations } from "../../lib/storage-fill-claims";
import { emitCardsStoredWebhook } from "../../lib/webhooks/events";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resolveGameId, activeBinSetWhere, loadBinConfigs } from "./shared";
import { orgHasFeature } from "../../lib/plan-config";
import { STORAGE_UPGRADE_MESSAGE } from "../../lib/constants/plan-access";
import { STORAGE_LOCATION_NOT_FOUND_MESSAGE } from "../../lib/constants/storage-locations";

export const emptyBinRoute = new Hono<AppEnv>().post(
  "/bins/:binNumber/empty",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const binNumber = parseInt(c.req.param("binNumber"));
    if (!Number.isInteger(binNumber) || binNumber < 1) {
      return c.json({ success: false, message: "Invalid bin number." }, 400);
    }
    const gameGuid = c.req.query("gameGuid");
    const { locationGuid: requestedLocationGuid, collectionGuid, storeInClaimedLocation = false } =
      await c.req.json<EmptyBinOptions>().catch((): EmptyBinOptions => ({}));
    if ((requestedLocationGuid || storeInClaimedLocation) && !collectionGuid) {
      return c.json(
        { success: false, message: "A collection is required." },
        400,
      );
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const gameId = await resolveGameId(tx, gameGuid);
      const activeBinSet = await tx.query.binSets.findFirst({
        where: (t) => activeBinSetWhere(t, orgId, gameId),
        columns: { id: true },
      });
      if (!activeBinSet)
        return { message: "No active set found.", success: false };

      let locationGuid = requestedLocationGuid;
      if (!locationGuid && storeInClaimedLocation) {
        await reclaimFillLocations(tx, activeBinSet.id);
        const bin = await tx.query.bins.findFirst({
          where: (t, { eq, and }) =>
            and(
              eq(t.binSet, activeBinSet.id),
              eq(t.binNumber, binNumber),
              eq(t.isDeleted, false),
              eq(t.isCatchAll, false),
            ),
          columns: { claimedStorageLocationId: true },
          with: { claimedStorageLocation: { columns: { guid: true } } },
        });
        locationGuid = bin?.claimedStorageLocation?.guid ?? undefined;
      }

      let storedScanIds: string[] = [];
      if (locationGuid && collectionGuid) {
        if (!(await orgHasFeature(tx, orgId, "storage"))) {
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
          return { message: STORAGE_LOCATION_NOT_FOUND_MESSAGE, success: false };
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
        storedScanIds = await assignBinToLocation(tx, {
          binNumber,
          collectionId: collection.id,
          locationId: location.id,
        });
        await tx
          .update(storageLocations)
          .set({ lastUsedAt: new Date() })
          .where(eq(storageLocations.id, location.id));
      }

      await markBinsEmptied(tx, orgId, [binNumber]);
      await reclaimFillLocations(tx, activeBinSet.id);

      return {
        message: "Bin marked as emptied.",
        success: true,
        assignedCount: storedScanIds.length,
        storedScanIds,
        storedLocationGuid: storedScanIds.length > 0 ? (locationGuid ?? null) : null,
        data: await loadBinConfigs(tx, orgId, activeBinSet.id),
      };
    });
    if (
      result.success &&
      "storedScanIds" in result &&
      result.storedScanIds &&
      result.storedLocationGuid
    ) {
      emitCardsStoredWebhook(orgId, result.storedLocationGuid, result.storedScanIds);
    }
    return c.json(result);
  },
);
