import {
  SCAN_ONLY_DEFAULT_BIN,
  type ScanOnlyConfig,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets, bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { applyScanOnlyBins, loadSets, snapshotBinSet } from "./shared";

function isBinNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export const setScanOnlyRoute = new Hono<AppEnv>().put(
  "/:guid/scan-only",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { enabled, matchedBin, unmatchedBin } =
      await c.req.json<ScanOnlyConfig>();
    if (
      (matchedBin != null && !isBinNumber(matchedBin)) ||
      (unmatchedBin !== undefined && !isBinNumber(unmatchedBin))
    ) {
      return c.json({ success: false, message: "Invalid bin number." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and }) =>
            and(
              eq(binSets.guid, guid),
              eq(binSets.orgId, orgId),
              eq(binSets.isDeleted, false),
            ),
          columns: { id: true, guid: true, scanOnly: true, scanOnlyBin: true },
          with: {
            bins: {
              where: (bin, { eq }) => eq(bin.isDeleted, false),
              columns: { binNumber: true, isCatchAll: true },
            },
          },
        });
        if (!target) return { message: "Set not found.", success: false };

        const currentCatchAll = target.bins.find(
          (b) => b.isCatchAll,
        )?.binNumber;
        const catchAllBin =
          unmatchedBin ??
          (target.scanOnly ? currentCatchAll : undefined) ??
          SCAN_ONLY_DEFAULT_BIN;

        if (enabled && (!target.scanOnly || catchAllBin !== currentCatchAll)) {
          await snapshotBinSet(tx, target.id, target.guid!, orgId);
          await applyScanOnlyBins(tx, target.id, orgId, catchAllBin);
        }

        const nextMatchedBin =
          matchedBin === undefined ? target.scanOnlyBin : matchedBin;
        const scanOnlyBin =
          enabled && nextMatchedBin !== catchAllBin ? nextMatchedBin : null;

        if (scanOnlyBin != null) {
          await tx
            .update(bins)
            .set({ isDisabled: false, updatedAt: new Date() })
            .where(
              and(
                eq(bins.binSet, target.id),
                eq(bins.binNumber, scanOnlyBin),
                eq(bins.isDeleted, false),
              ),
            );
        }

        await tx
          .update(binSets)
          .set({ scanOnly: enabled, scanOnlyBin, updatedAt: new Date() })
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
