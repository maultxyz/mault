import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { binSetNameTaken, loadSets, resolveGameId } from "./shared";

export const copyBinSetRoute = new Hono<AppEnv>().post(
  "/copies",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { name, gameGuid } = await c.req.json<{
      name: string;
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

        const active = await tx.query.binSets.findFirst({
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
          with: {
            bins: {
              columns: {
                binNumber: true,
                rules: true,
                isCatchAll: true,
                isOverride: true,
                cardLimit: true,
              },
            },
          },
        });
        const activeBins = active?.bins ?? [];
        const [newBinSet] = await tx
          .insert(binSets)
          .values({ name, isActive: false, gameId, orgId })
          .returning({ id: binSets.id });
        if (activeBins.length > 0) {
          await tx.insert(bins).values(
            activeBins.map((bin) => ({
              binNumber: bin.binNumber,
              rules: bin.rules,
              isCatchAll: bin.isCatchAll,
              isOverride: bin.isOverride,
              cardLimit: bin.cardLimit,
              binSet: newBinSet.id,
              orgId,
            })),
          );
        }
        return loadSets(tx, orgId);
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
