import {
  computeBinCount,
  DEFAULT_BIN_CAPACITY,
  type DefaultBinInit,
} from "@magic-vault/shared";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { binSetNameTaken, emptyRules, getModuleCount, loadSets, resolveGameId } from "./shared";

export const addBinSetRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { name, initialBins, gameGuid } = await c.req.json<{
      name: string;
      initialBins?: DefaultBinInit[];
      gameGuid?: string;
    }>();
    try {
      const nameTaken = await authQuery(c.get("jwtClaims"), async (tx) =>
        binSetNameTaken(tx, orgId, await resolveGameId(tx, gameGuid), name),
      );
      if (nameTaken) {
        return c.json(
          {
            success: false,
            message: `A set named "${name.trim()}" already exists.`,
          },
          409,
        );
      }

      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await resolveGameId(tx, gameGuid);

        await tx
          .update(binSets)
          .set({ isActive: false })
          .where(
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
          );

        const [newBinSet] = await tx
          .insert(binSets)
          .values({ name, isActive: true, gameId, orgId })
          .returning({ id: binSets.id });
        const binsToInsert = Array.isArray(initialBins)
          ? initialBins
          : Array.from(
              { length: computeBinCount(await getModuleCount(tx, orgId)) },
              (_, i) => ({
                binNumber: i + 1,
                rules: emptyRules(),
                isCatchAll: false,
                cardLimit: DEFAULT_BIN_CAPACITY,
              }),
            );
        await tx.insert(bins).values(
          binsToInsert.map((b) => ({
            binNumber: b.binNumber,
            rules: b.rules,
            isCatchAll: b.isCatchAll,
            cardLimit: b.cardLimit ?? DEFAULT_BIN_CAPACITY,
            binSet: newBinSet.id,
            orgId,
          })),
        );
        return loadSets(tx, orgId);
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
