import { normalizeAlphabetPrefix } from "@magic-vault/shared";
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
    const body = await c.req.json<{
      isAlphabetMode: boolean;
      alphabetPass: number;
      alphabetPrefix?: string;
    }>();
    const { isAlphabetMode, alphabetPass } = body;
    if (!Number.isInteger(alphabetPass) || alphabetPass < 0) {
      return c.json({ success: false, message: "Invalid pass." }, 400);
    }
    if (
      body.alphabetPrefix !== undefined &&
      typeof body.alphabetPrefix !== "string"
    ) {
      return c.json({ success: false, message: "Invalid prefix." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: {
            id: true,
            isAlphabetMode: true,
            alphabetPass: true,
            alphabetPrefix: true,
          },
        });
        if (!target) return { message: "Set not found.", success: false };

        const alphabetPrefix =
          body.alphabetPrefix === undefined
            ? target.alphabetPrefix
            : normalizeAlphabetPrefix(body.alphabetPrefix);
        const startsPass =
          isAlphabetMode &&
          (!target.isAlphabetMode ||
            alphabetPass !== target.alphabetPass ||
            alphabetPrefix !== target.alphabetPrefix);
        const now = new Date();
        if (startsPass) {
          await tx
            .update(bins)
            .set({ lastEmptiedAt: now, updatedAt: now })
            .where(eq(bins.binSet, target.id));
        }

        await tx
          .update(binSets)
          .set({
            isAlphabetMode,
            alphabetPass,
            alphabetPrefix,
            updatedAt: now,
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
