import { DEFAULT_BIN_CAPACITY, type BinConfig } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins, binSetAudit } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  fromLegacyCatchAllRules,
  loadSets,
  toIsDisabled,
  toLowMatchPercent,
  toMaxCopies,
  toOverridePriority,
} from "./shared";

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
            and(
              eq(t.guid, entry.binSetGuid),
              eq(t.orgId, orgId),
              eq(t.isDeleted, false),
            ),
          columns: { id: true, guid: true },
          with: {
            bins: {
              where: (bin, { eq }) => eq(bin.isDeleted, false),
              columns: { id: true, binNumber: true },
            },
          },
        });
        if (!binSet) return { success: false, message: "Bin set not found." };

        const snapshot = entry.snapshot as BinConfig[];
        for (const config of snapshot) {
          // A pre-capacity snapshot has no cardLimit field at all
          // (undefined) - fall back to the default rather than reverting
          // it to unlimited. An explicit null (deliberately set to
          // unlimited at snapshot time) is preserved as-is.
          const cardLimit =
            config.cardLimit === undefined
              ? DEFAULT_BIN_CAPACITY
              : config.cardLimit;
          const { rules, lowMatchPercent } = fromLegacyCatchAllRules(config);
          const restored = {
            rules,
            isCatchAll: config.isCatchAll,
            isOverride: !config.isCatchAll && (config.isOverride ?? false),
            overridePriority: toOverridePriority(
              config.overridePriority,
              config.isCatchAll,
              config.isOverride,
            ),
            lowMatchPercent: toLowMatchPercent(
              lowMatchPercent,
              config.isCatchAll,
            ),
            cardLimit,
            maxCopies: toMaxCopies(config.maxCopies, config.isCatchAll),
            isDisabled: toIsDisabled(config.isDisabled, config.isCatchAll),
          };
          const existing = binSet.bins.find(
            (b) => b.binNumber === config.binNumber,
          );
          if (existing) {
            await tx
              .update(bins)
              .set({ ...restored, updatedAt: new Date() })
              .where(eq(bins.id, existing.id));
          } else {
            await tx.insert(bins).values({
              binNumber: config.binNumber,
              ...restored,
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
