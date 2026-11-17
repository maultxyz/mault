import type { BinConfig } from "@magic-vault/shared";
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
  toMaxCopiesBy,
  toOverflowBin,
  toOverridePriority,
  toRepackPriority,
  normalizeOverflowBins,
  toBinPickList,
} from "./shared";

export const revertBinSetRoute = new Hono<AppEnv>().post(
  "/history/:guid/revert",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const entry = await tx.query.binSetAudit.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
      });
      if (!entry)
        return { success: false, message: "Audit record not found." };

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
            columns: { id: true, binNumber: true, pickList: true },
          },
        },
      });
      if (!binSet) return { success: false, message: "Bin set not found." };

      const snapshot = entry.snapshot as BinConfig[];
      for (const config of snapshot) {
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
          maxCopies: toMaxCopies(config.maxCopies, config.isCatchAll),
          maxCopiesBy: toMaxCopiesBy(
            config.maxCopiesBy,
            config.isCatchAll,
            toMaxCopies(config.maxCopies, config.isCatchAll),
          ),
          overflowBin: toOverflowBin(config.overflowBin, config.binNumber),
          isDisabled: toIsDisabled(config.isDisabled, config.isCatchAll),
          repackPriority: toRepackPriority(
            config.repackPriority,
            config.isCatchAll,
          ),
        };
        const existing = binSet.bins.find(
          (b) => b.binNumber === config.binNumber,
        );
        const pickList = toBinPickList(
          config.pickList ?? null,
          config.isCatchAll,
          existing?.pickList,
        );
        if (existing) {
          await tx
            .update(bins)
            .set({ ...restored, pickList, updatedAt: new Date() })
            .where(eq(bins.id, existing.id));
        } else {
          await tx.insert(bins).values({
            binNumber: config.binNumber,
            ...restored,
            pickList,
            binSet: binSet.id,
            orgId,
          });
        }
      }
      await normalizeOverflowBins(tx, binSet.id);

      await tx.insert(binSetAudit).values({
        binSetGuid: entry.binSetGuid,
        snapshot: entry.snapshot,
        orgId,
      });
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
