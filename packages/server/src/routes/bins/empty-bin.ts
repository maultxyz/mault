import type { BinConfig, BinRuleGroup } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
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
                )
              : and(
                  eq(binSets.isActive, true),
                  eq(binSets.gameId, gameId),
                  eq(binSets.orgId, orgId),
                ),
          columns: { id: true },
          with: { bins: { columns: { id: true, binNumber: true } } },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };

        const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
        if (!existing) return { message: "Bin not found.", success: false };

        await tx
          .update(bins)
          .set({ lastEmptiedAt: new Date(), updatedAt: new Date() })
          .where(eq(bins.id, existing.id));

        const updatedBins = await tx.query.bins.findMany({
          where: (t, { eq }) => eq(t.binSet, activeBinSet.id),
          columns: {
            guid: true,
            binNumber: true,
            rules: true,
            isCatchAll: true,
            isOverride: true,
            cardLimit: true,
            lastEmptiedAt: true,
          },
        });

        return {
          message: "Bin marked as emptied.",
          success: true,
          data: updatedBins.map(
            (b): BinConfig => ({
              guid: b.guid!,
              binNumber: b.binNumber,
              rules: b.rules as BinRuleGroup,
              isCatchAll: b.isCatchAll,
              isOverride: b.isOverride,
              cardLimit: b.cardLimit,
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
