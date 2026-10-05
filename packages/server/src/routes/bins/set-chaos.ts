import { CHAOS_BIN_SIZE_MAX } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import {
  CHAOS_SORT_UPGRADE_MESSAGE,
  isChaosSortAllowed,
} from "../../lib/chaos-sort-access";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

export const setChaosRoute = new Hono<AppEnv>().put(
  "/:guid/chaos",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { isChaosMode, chaosBinSize } = await c.req.json<{
      isChaosMode: boolean;
      chaosBinSize?: number | null;
    }>();
    if (typeof isChaosMode !== "boolean") {
      return c.json({ success: false, message: "Invalid mode." }, 400);
    }
    if (
      chaosBinSize != null &&
      (!Number.isInteger(chaosBinSize) ||
        chaosBinSize < 1 ||
        chaosBinSize > CHAOS_BIN_SIZE_MAX)
    ) {
      return c.json({ success: false, message: "Invalid bin size." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true, isChaosMode: true },
        });
        if (!target) return { message: "Set not found.", success: false };
        if (
          isChaosMode &&
          !target.isChaosMode &&
          !(await isChaosSortAllowed(tx, orgId))
        ) {
          return {
            success: false,
            message: CHAOS_SORT_UPGRADE_MESSAGE,
            upgradeRequired: true,
          };
        }
        await tx
          .update(binSets)
          .set({
            isChaosMode,
            ...(chaosBinSize !== undefined ? { chaosBinSize } : {}),
            updatedAt: new Date(),
          })
          .where(eq(binSets.id, target.id));
        return loadSets(tx, orgId);
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
