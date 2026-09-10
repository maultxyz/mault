import type { BinConfig, BinRuleGroup } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resolveGameId, snapshotBinSet } from "./shared";

export const editBinRoute = new Hono<AppEnv>().put(
  "/bins/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const binNumber = parseInt(c.req.param("binNumber"));
    const gameGuid = c.req.query("gameGuid");
    const { rules, isCatchAll } = await c.req.json<{
      rules: BinRuleGroup;
      isCatchAll?: boolean;
    }>();
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
          columns: { id: true, guid: true },
          with: { bins: { columns: { id: true, binNumber: true } } },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };

        if (isCatchAll) {
          await tx
            .update(bins)
            .set({ isCatchAll: false, updatedAt: new Date() })
            .where(
              and(eq(bins.binSet, activeBinSet.id), eq(bins.isCatchAll, true)),
            );
        }

        const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);

        if (existing) {
          await tx
            .update(bins)
            .set({
              rules,
              isCatchAll: isCatchAll ?? false,
              updatedAt: new Date(),
            })
            .where(eq(bins.id, existing.id));
        } else {
          await tx.insert(bins).values({
            binNumber,
            rules,
            isCatchAll: isCatchAll ?? false,
            binSet: activeBinSet.id,
            orgId,
          });
        }

        await snapshotBinSet(tx, activeBinSet.id, activeBinSet.guid!, orgId);

        const updatedBins = await tx.query.bins.findMany({
          where: (t, { eq }) => eq(t.binSet, activeBinSet.id),
          columns: { guid: true, binNumber: true, rules: true, isCatchAll: true },
        });

        return {
          message: "Successfully saved bin config.",
          success: true,
          data: updatedBins.map(
            (b): BinConfig => ({
              guid: b.guid!,
              binNumber: b.binNumber,
              rules: b.rules as BinRuleGroup,
              isCatchAll: b.isCatchAll,
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
