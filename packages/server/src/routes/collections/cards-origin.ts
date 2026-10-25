import type { CardScanOrigin } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards, devices, unmatchedCards } from "../../db/schema";
import {
  getUserDisplayName,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { isUuid } from "./cards-query";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const collectionCardOriginRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/origin",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const scanId = c.req.param("scanId");
    if (!isUuid(scanId)) return c.json({ success: true, data: null });
    try {
      const row = await authQuery(c.get("jwtClaims"), async (tx) => {
        const deviceColumns = {
          deviceGuid: devices.guid,
          deviceName: devices.name,
          deviceIsDeleted: devices.isDeleted,
        };
        const [matched] = await tx
          .select({ userId: collectionCards.scannedByUserId, ...deviceColumns })
          .from(collectionCards)
          .leftJoin(devices, eq(devices.id, collectionCards.scannedByDeviceId))
          .where(
            and(
              eq(collectionCards.guid, scanId),
              eq(collectionCards.orgId, orgId),
            ),
          )
          .limit(1);
        if (matched) return matched;
        const [unmatched] = await tx
          .select({ userId: unmatchedCards.scannedByUserId, ...deviceColumns })
          .from(unmatchedCards)
          .leftJoin(devices, eq(devices.id, unmatchedCards.scannedByDeviceId))
          .where(
            and(
              eq(unmatchedCards.guid, scanId),
              eq(unmatchedCards.orgId, orgId),
            ),
          )
          .limit(1);
        return unmatched ?? null;
      });
      if (!row) return c.json({ success: true, data: null });
      const data: CardScanOrigin = {
        scannedBy: row.userId
          ? { userId: row.userId, name: await getUserDisplayName(row.userId) }
          : null,
        device:
          row.deviceGuid && row.deviceName
            ? {
                guid: row.deviceGuid,
                name: row.deviceName,
                isDeleted: row.deviceIsDeleted ?? false,
              }
            : null,
      };
      return c.json({ success: true, data });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
