import { normalizeAlphabetPrefix } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { markBinsEmptied } from "../../lib/bin-emptying";
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
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: {
          id: true,
          isAlphabetMode: true,
          alphabetPass: true,
          alphabetPrefix: true,
        },
        with: {
          bins: {
            where: (bin, { eq }) => eq(bin.isDeleted, false),
            columns: { binNumber: true },
          },
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
      if (startsPass) {
        await markBinsEmptied(
          tx,
          orgId,
          target.bins.map((bin) => bin.binNumber),
        );
      }

      await tx
        .update(binSets)
        .set({
          isAlphabetMode,
          alphabetPass,
          alphabetPrefix,
          updatedAt: new Date(),
        })
        .where(eq(binSets.id, target.id));
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
