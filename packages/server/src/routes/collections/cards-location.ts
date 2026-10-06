import type { CardStorageLocation } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards, storageLocations } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const collectionCardLocationRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/location",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [row] = await tx
          .select({
            guid: storageLocations.guid,
            name: storageLocations.name,
            position: collectionCards.locationPosition,
          })
          .from(collectionCards)
          .innerJoin(
            storageLocations,
            and(
              eq(storageLocations.id, collectionCards.locationId),
              eq(storageLocations.isDeleted, false),
            ),
          )
          .where(
            and(eq(collectionCards.guid, scanId), eq(collectionCards.orgId, orgId)),
          )
          .limit(1);
        const data: CardStorageLocation | null = row
          ? { guid: row.guid!, name: row.name, position: row.position ?? 0 }
          : null;
        return { success: true, data };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
