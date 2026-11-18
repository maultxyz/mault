import { PRESET_FILL_STORAGE_LOCATIONS_MAX } from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets, storageLocations } from "../../db/schema";
import { STORAGE_UPGRADE_MESSAGE } from "../../lib/constants/plan-access";
import { STORAGE_LOCATION_NOT_FOUND_MESSAGE } from "../../lib/constants/storage-locations";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { orgHasFeature } from "../../lib/plan-config";
import { reclaimFillLocations } from "../../lib/storage-fill-claims";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

export const setFillLocationsRoute = new Hono<AppEnv>().put(
  "/:guid/fill-locations",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { storageLocationGuids } = await c.req
      .json<{ storageLocationGuids: unknown }>()
      .catch(() => ({ storageLocationGuids: undefined }));
    if (
      !Array.isArray(storageLocationGuids) ||
      storageLocationGuids.length > PRESET_FILL_STORAGE_LOCATIONS_MAX ||
      !storageLocationGuids.every(
        (locationGuid) =>
          typeof locationGuid === "string" && UUID_PATTERN.test(locationGuid),
      )
    ) {
      return c.json({ success: false, message: "Invalid locations." }, 400);
    }
    const requestedGuids = [...new Set(storageLocationGuids as string[])];
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      if (
        requestedGuids.length > 0 &&
        !(await orgHasFeature(tx, orgId, "storage"))
      ) {
        return {
          success: false,
          message: STORAGE_UPGRADE_MESSAGE,
          upgradeRequired: true,
        };
      }
      const locations =
        requestedGuids.length > 0
          ? await tx
              .select({ id: storageLocations.id, guid: storageLocations.guid })
              .from(storageLocations)
              .where(
                and(
                  inArray(storageLocations.guid, requestedGuids),
                  eq(storageLocations.orgId, orgId),
                  eq(storageLocations.isDeleted, false),
                ),
              )
          : [];
      const idsByGuid = new Map(
        locations.map((location) => [location.guid!, location.id]),
      );
      if (idsByGuid.size !== requestedGuids.length) {
        return { success: false, message: STORAGE_LOCATION_NOT_FOUND_MESSAGE };
      }
      await tx
        .update(binSets)
        .set({
          fillStorageLocationIds: requestedGuids.map(
            (locationGuid) => idsByGuid.get(locationGuid)!,
          ),
          updatedAt: new Date(),
        })
        .where(eq(binSets.id, target.id));
      await reclaimFillLocations(tx, target.id);
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
