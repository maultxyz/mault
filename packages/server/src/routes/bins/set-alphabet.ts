import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

export const setAlphabetRoute = new Hono<AppEnv>().put(
  "/:guid/alphabet",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { isAlphabetMode, alphabetPass } = await c.req.json<{
      isAlphabetMode: boolean;
      alphabetPass: number;
    }>();
    if (!Number.isInteger(alphabetPass) || alphabetPass < 0) {
      return c.json({ success: false, message: "Invalid pass." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true, isAlphabetMode: true, alphabetPass: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        const startsPass =
          isAlphabetMode &&
          (!target.isAlphabetMode || alphabetPass !== target.alphabetPass);
        const now = new Date();
        if (startsPass) {
          await tx
            .update(bins)
            .set({ lastEmptiedAt: now, updatedAt: now })
            .where(eq(bins.binSet, target.id));
        }

        await tx
          .update(binSets)
          .set({ isAlphabetMode, alphabetPass, updatedAt: now })
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
