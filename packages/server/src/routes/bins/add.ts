import {
  computeBinCount,
  DEFAULT_BIN_CAPACITY,
  type DefaultBinInit,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  binSetNameTaken,
  emptyRules,
  getModuleCount,
  loadSets,
  resolveGameId,
  fromLegacyCatchAllRules,
  toIsDisabled,
  toLowMatchPercent,
  toMaxCopies,
  toOverridePriority,
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
          .where(activeBinSetWhere(binSets, orgId, gameId));

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
                cardLimit: DEFAULT_BIN_CAPACITY,
              }),
            );
        await tx.insert(bins).values(
          binsToInsert.map((b) => {
            const { rules, lowMatchPercent } = fromLegacyCatchAllRules(b);
            return {
              binNumber: b.binNumber,
              rules,
              isCatchAll: b.isCatchAll,
              isOverride: !b.isCatchAll && b.isOverride === true,
              overridePriority: toOverridePriority(
                b.overridePriority,
                b.isCatchAll,
                b.isOverride,
              ),
              lowMatchPercent: toLowMatchPercent(lowMatchPercent, b.isCatchAll),
              cardLimit: b.cardLimit ?? DEFAULT_BIN_CAPACITY,
              maxCopies: toMaxCopies(b.maxCopies, b.isCatchAll),
              isDisabled: toIsDisabled(b.isDisabled, b.isCatchAll),
              binSet: newBinSet.id,
              orgId,
            };
          }),
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
