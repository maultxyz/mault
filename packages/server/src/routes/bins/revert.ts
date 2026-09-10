import type { BinConfig } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSetAudit } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

export const revertBinSetRoute = new Hono<AppEnv>().post(
  "/history/:guid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const entry = await tx.query.binSetAudit.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
        });
        if (!entry) return { success: false, message: "Audit record not found." };

        const binSet = await tx.query.binSets.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, entry.binSetGuid), eq(t.orgId, orgId)),
          columns: { id: true, guid: true },
          with: { bins: { columns: { id: true, binNumber: true } } },
        });
        if (!binSet) return { success: false, message: "Bin set not found." };

        const snapshot = entry.snapshot as BinConfig[];
        for (const config of snapshot) {
          const existing = binSet.bins.find(
            (b) => b.binNumber === config.binNumber,
          );
          if (existing) {
            await tx
              .update(bins)
              .set({
                rules: config.rules,
                isCatchAll: config.isCatchAll,
                updatedAt: new Date(),
              })
              .where(eq(bins.id, existing.id));
          } else {
            await tx.insert(bins).values({
              binNumber: config.binNumber,
              rules: config.rules,
              isCatchAll: config.isCatchAll,
              binSet: binSet.id,
              orgId,
            });
          }
        }

        await tx.insert(binSetAudit).values({
          binSetGuid: entry.binSetGuid,
          snapshot: entry.snapshot,
          orgId,
        });
        return loadSets(tx, orgId);
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
