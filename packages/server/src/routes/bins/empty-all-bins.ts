import type { EmptyAllBinsInput } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  activeBinSetWhere,
  emptyRules,
  loadSets,
  resolveGameId,
} from "./shared";

export const emptyAllBinsRoute = new Hono<AppEnv>().post(
  "/bins/empty-all",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const gameGuid = c.req.query("gameGuid");
    const { binNumbers = [] } = await c.req
      .json<Partial<EmptyAllBinsInput>>()
      .catch((): Partial<EmptyAllBinsInput> => ({}));
    if (
      !Array.isArray(binNumbers) ||
      binNumbers.some((n) => !Number.isInteger(n) || n < 1)
    ) {
      return c.json({ success: false, message: "Invalid bin numbers." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await resolveGameId(tx, gameGuid);
        const activeBinSet = await tx.query.binSets.findFirst({
          where: (t) => activeBinSetWhere(t, orgId, gameId),
          columns: { id: true },
          with: {
            bins: {
              where: (bin, { eq }) => eq(bin.isDeleted, false),
              columns: { binNumber: true },
            },
          },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };

        const now = new Date();
        const existing = new Set(activeBinSet.bins.map((b) => b.binNumber));
        const missing = [...new Set(binNumbers)].filter(
          (n) => !existing.has(n),
        );
        if (missing.length > 0) {
          await tx.insert(bins).values(
            missing.map((binNumber) => ({
              binNumber,
              rules: emptyRules(),
              binSet: activeBinSet.id,
              orgId,
              lastEmptiedAt: now,
            })),
          );
        }
        await tx
          .update(bins)
          .set({ lastEmptiedAt: now, updatedAt: now })
          .where(
            and(eq(bins.binSet, activeBinSet.id), eq(bins.isDeleted, false)),
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
