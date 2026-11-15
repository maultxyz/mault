import {
  computeBinCount,
  type DefaultBinInit,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSets } from "../../db/schema";
import { deactivatePresetWorkflows } from "../../lib/preset-workflows";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  binInsertValues,
  binSetNameTaken,
  emptyRules,
  getModuleCount,
  loadSets,
  resolveGameId,
  normalizeOverflowBins,
  activeBinSetWhere,
} from "./shared";

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
        .where(activeBinSetWhere(binSets, orgId, gameId));
      await deactivatePresetWorkflows(tx, orgId, gameId);

      const [newBinSet] = await tx
        .insert(binSets)
        .values({ name, isActive: true, gameId, orgId })
        .returning({ id: binSets.id });
      const binsToInsert: DefaultBinInit[] = Array.isArray(initialBins)
        ? initialBins
        : Array.from(
            { length: computeBinCount(await getModuleCount(tx, orgId)) },
            (_, i) => ({
              binNumber: i + 1,
              rules: emptyRules(),
              isCatchAll: false,
              isOverride: false,
            }),
          );
      await tx.insert(bins).values(
        binsToInsert.map((b) => binInsertValues(b, newBinSet.id, orgId)),
      );
      await normalizeOverflowBins(tx, newBinSet.id);
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
