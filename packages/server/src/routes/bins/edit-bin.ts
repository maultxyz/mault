import {
  toPickList,
  type BinConfig,
  type BinRuleGroup,
  type PickListInput,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  resolveGameId,
  snapshotBinSet,
  toIsDisabled,
  toLowMatchPercent,
  toMaxCopies,
  toMaxCopiesBy,
  toOverflowBin,
  toOverridePriority,
  toRepackPriority,
  activeBinSetWhere,
  emptyRules,
  normalizeOverflowBins,
  toBinPickList,
} from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const editBinRoute = new Hono<AppEnv>().put(
  "/bins/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const binNumber = parseInt(c.req.param("binNumber"));
    const gameGuid = c.req.query("gameGuid");
    const {
      rules,
      isCatchAll,
      isOverride,
      overridePriority,
      lowMatchPercent,
      maxCopies,
      maxCopiesBy,
      overflowBin,
      isDisabled,
      pickList,
      repackPriority,
    } = await c.req.json<{
      rules: BinRuleGroup;
      isCatchAll?: boolean;
      isOverride?: boolean;
      overridePriority?: number | null;
      lowMatchPercent?: number | null;
      maxCopies?: number | null;
      maxCopiesBy?: string | null;
      overflowBin?: number | null;
      isDisabled?: boolean;
      pickList?: PickListInput | null;
      repackPriority?: number | null;
    }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await resolveGameId(tx, gameGuid);
        const activeBinSet = await tx.query.binSets.findFirst({
          where: (t) => activeBinSetWhere(t, orgId, gameId),
          columns: { id: true, guid: true },
          with: {
            bins: {
              where: (bin, { eq }) => eq(bin.isDeleted, false),
              columns: {
                id: true,
                binNumber: true,
                isDisabled: true,
                overflowBin: true,
                pickList: true,
                repackPriority: true,
              },
            },
          },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };

        if (isCatchAll) {
          await tx
            .update(bins)
            .set({ isCatchAll: false, updatedAt: new Date() })
            .where(
              and(eq(bins.binSet, activeBinSet.id), eq(bins.isCatchAll, true)),
            );
        }

        const existing = activeBinSet.bins.find(
          (b) => b.binNumber === binNumber,
        );

        const nextPickList = toBinPickList(
          pickList,
          isCatchAll,
          existing?.pickList,
        );
        const isPickList = nextPickList != null;
        const nextMaxCopies = isPickList
          ? null
          : toMaxCopies(maxCopies, isCatchAll);
        const values = {
          rules: isPickList ? emptyRules() : rules,
          isCatchAll: isCatchAll ?? false,
          isOverride: !isCatchAll && !isPickList && isOverride === true,
          overridePriority: isPickList
            ? null
            : toOverridePriority(overridePriority, isCatchAll, isOverride),
          lowMatchPercent: toLowMatchPercent(lowMatchPercent, isCatchAll),
          maxCopies: nextMaxCopies,
          maxCopiesBy: toMaxCopiesBy(maxCopiesBy, isCatchAll, nextMaxCopies),
          pickList: nextPickList,
        };

        if (existing) {
          await tx
            .update(bins)
            .set({
              ...values,
              overflowBin: isPickList
                ? null
                : overflowBin === undefined
                  ? existing.overflowBin
                  : toOverflowBin(overflowBin, binNumber),
              isDisabled: toIsDisabled(
                isDisabled ?? existing.isDisabled,
                isCatchAll,
              ),
              repackPriority: toRepackPriority(
                repackPriority === undefined
                  ? existing.repackPriority
                  : repackPriority,
                isCatchAll,
              ),
              updatedAt: new Date(),
            })
            .where(eq(bins.id, existing.id));
        } else {
          await tx.insert(bins).values({
            ...values,
            binNumber,
            overflowBin: isPickList ? null : toOverflowBin(overflowBin, binNumber),
            isDisabled: toIsDisabled(isDisabled, isCatchAll),
            repackPriority: toRepackPriority(repackPriority, isCatchAll),
            binSet: activeBinSet.id,
            orgId,
          });
        }

        await normalizeOverflowBins(tx, activeBinSet.id);
        await snapshotBinSet(tx, activeBinSet.id, activeBinSet.guid!, orgId);

        const updatedBins = await tx.query.bins.findMany({
          where: (t, { eq, and }) =>
            and(eq(t.binSet, activeBinSet.id), eq(t.isDeleted, false)),
          columns: {
            guid: true,
            binNumber: true,
            rules: true,
            isCatchAll: true,
            isOverride: true,
            overridePriority: true,
            lowMatchPercent: true,
            maxCopies: true,
            maxCopiesBy: true,
            overflowBin: true,
            isDisabled: true,
            pickList: true,
            repackPriority: true,
            lastEmptiedAt: true,
          },
        });

        return {
          message: "Successfully saved bin config.",
          success: true,
          data: updatedBins.map(
            (b): BinConfig => ({
              guid: b.guid!,
              binNumber: b.binNumber,
              rules: b.rules as BinRuleGroup,
              isCatchAll: b.isCatchAll,
              isOverride: b.isOverride,
              overridePriority: b.overridePriority,
              lowMatchPercent: b.lowMatchPercent,
              maxCopies: b.maxCopies,
              maxCopiesBy: b.maxCopiesBy,
              overflowBin: b.overflowBin,
              isDisabled: b.isDisabled,
              pickList: b.isCatchAll ? null : toPickList(b.pickList),
              repackPriority: b.repackPriority,
              lastEmptiedAt: b.lastEmptiedAt ? b.lastEmptiedAt.getTime() : null,
            }),
          ),
        };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
