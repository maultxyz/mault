import {
  computeBinCount,
  DEFAULT_MODULE_COUNT,
  type BinConfig,
  type BinRuleGroup,
  type BinSet,
  type DefaultBinInit,
  type FieldMeta,
} from "@magic-vault/shared";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../db";
import { authQuery } from "../db";
import { bins, binSetAudit, binSets } from "../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

async function _getModuleCount(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  const row = await tx.query.orgSettings.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { moduleCount: true },
  });
  return row?.moduleCount ?? DEFAULT_MODULE_COUNT;
}

const router = new Hono<AppEnv>();

function emptyRules(): BinRuleGroup {
  return {
    id: crypto.randomUUID(),
    combinator: "and" as const,
    conditions: [],
  };
}

function toBinSet(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  autoAssignField: string | null;
  createdAt: Date;
  updatedAt: Date;
  bins: {
    guid: string | null;
    binNumber: number;
    rules: unknown;
    isCatchAll: boolean;
  }[];
  game: {
    guid: string | null;
    key: string;
    name: string;
    isActive: boolean;
    fieldDefinitions: unknown;
    apiDocsUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}): BinSet {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    autoAssignField: row.autoAssignField,
    bins: row.bins.map((bin) => ({
      guid: bin.guid!,
      binNumber: bin.binNumber,
      rules: bin.rules as BinRuleGroup,
      isCatchAll: bin.isCatchAll,
    })),
    game: row.game
      ? {
          guid: row.game.guid!,
          key: row.game.key,
          name: row.game.name,
          isActive: row.game.isActive,
          fieldDefinitions: row.game.fieldDefinitions as FieldMeta[],
          apiDocsUrl: row.game.apiDocsUrl,
          createdAt: row.game.createdAt,
          updatedAt: row.game.updatedAt,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const binSetQuery = {
  columns: {
    guid: true,
    name: true,
    isActive: true,
    autoAssignField: true,
    createdAt: true,
    updatedAt: true,
  },
  with: {
    bins: {
      columns: { guid: true, binNumber: true, rules: true, isCatchAll: true },
    },
    game: true,
  },
} as const;

async function _loadSets(tx: Transaction, orgId: string) {
  const rows = await tx.query.binSets.findMany({
    ...binSetQuery,
    where: (binSets, { eq }) => eq(binSets.orgId, orgId),
    orderBy: (binSets, { desc }) => [desc(binSets.updatedAt)],
  });
  return { message: "Loaded sets.", success: true, data: rows.map(toBinSet) };
}

async function _snapshotBinSet(
  tx: Transaction,
  binSetId: number,
  binSetGuid: string,
  orgId: string,
) {
  const rows = await tx.query.bins.findMany({
    where: (bins, { eq }) => eq(bins.binSet, binSetId),
    columns: { guid: true, binNumber: true, rules: true, isCatchAll: true },
  });
  const snapshot: BinConfig[] = rows.map((r) => ({
    guid: r.guid!,
    binNumber: r.binNumber,
    rules: r.rules as BinRuleGroup,
    isCatchAll: r.isCatchAll,
  }));
  await tx.insert(binSetAudit).values({ binSetGuid, snapshot, orgId });
}

// Resolves a game guid (from the client) to its internal id, or null if
// omitted - bin sets with no game are legacy/game-agnostic sets.
async function _resolveGameId(
  tx: Transaction,
  gameGuid: string | undefined,
): Promise<number | null> {
  if (!gameGuid) return null;
  const game = await tx.query.games.findFirst({
    where: (t, { eq }) => eq(t.guid, gameGuid),
    columns: { id: true },
  });
  return game?.id ?? null;
}

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), (tx) =>
      _loadSets(tx, orgId),
    );
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid/active", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq, and }) =>
          and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
        columns: { id: true, gameId: true },
      });
      if (!target) return { message: "Set not found.", success: false };

      // Only one active set per game (or per "no game") - activating a
      // Gundam set shouldn't deactivate an already-active Magic set.
      await tx
        .update(binSets)
        .set({ isActive: false })
        .where(
          target.gameId === null
            ? and(
                eq(binSets.isActive, true),
                isNull(binSets.gameId),
                eq(binSets.orgId, orgId),
              )
            : and(
                eq(binSets.isActive, true),
                eq(binSets.gameId, target.gameId),
                eq(binSets.orgId, orgId),
              ),
        );
      await tx
        .update(binSets)
        .set({ isActive: true })
        .where(eq(binSets.id, target.id));
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name, initialBins, gameGuid } = await c.req.json<{
    name: string;
    initialBins?: DefaultBinInit[];
    gameGuid?: string;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const gameId = await _resolveGameId(tx, gameGuid);

      await tx
        .update(binSets)
        .set({ isActive: false })
        .where(
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
        );

      const [newBinSet] = await tx
        .insert(binSets)
        .values({ name, isActive: true, gameId, orgId })
        .returning({ id: binSets.id });
      const binsToInsert = Array.isArray(initialBins)
        ? initialBins
        : Array.from(
            { length: computeBinCount(await _getModuleCount(tx, orgId)) },
            (_, i) => ({
              binNumber: i + 1,
              rules: emptyRules(),
              isCatchAll: false,
            }),
          );
      await tx.insert(bins).values(
        binsToInsert.map((b) => ({
          binNumber: b.binNumber,
          rules: b.rules,
          isCatchAll: b.isCatchAll,
          binSet: newBinSet.id,
          orgId,
        })),
      );
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/copies", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name, gameGuid } = await c.req.json<{
    name: string;
    gameGuid?: string;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const gameId = await _resolveGameId(tx, gameGuid);

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
          bins: { columns: { binNumber: true, rules: true, isCatchAll: true } },
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
            binSet: newBinSet.id,
            orgId,
          })),
        );
      }
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/bins/:binNumber", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const binNumber = parseInt(c.req.param("binNumber"));
  const gameGuid = c.req.query("gameGuid");
  const { rules, isCatchAll } = await c.req.json<{
    rules: BinRuleGroup;
    isCatchAll?: boolean;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const gameId = await _resolveGameId(tx, gameGuid);
      const activeBinSet = await tx.query.binSets.findFirst({
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
        columns: { id: true, guid: true },
        with: { bins: { columns: { id: true, binNumber: true } } },
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

      const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);

      if (existing) {
        await tx
          .update(bins)
          .set({
            rules,
            isCatchAll: isCatchAll ?? false,
            updatedAt: new Date(),
          })
          .where(eq(bins.id, existing.id));
      } else {
        await tx.insert(bins).values({
          binNumber,
          rules,
          isCatchAll: isCatchAll ?? false,
          binSet: activeBinSet.id,
          orgId,
        });
      }

      await _snapshotBinSet(tx, activeBinSet.id, activeBinSet.guid!, orgId);

      const updatedBins = await tx.query.bins.findMany({
        where: (t, { eq }) => eq(t.binSet, activeBinSet.id),
        columns: { guid: true, binNumber: true, rules: true, isCatchAll: true },
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
          }),
        ),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/bins/:binNumber", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const binNumber = parseInt(c.req.param("binNumber"));
  const gameGuid = c.req.query("gameGuid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const gameId = await _resolveGameId(tx, gameGuid);
      const activeBinSet = await tx.query.binSets.findFirst({
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
        with: { bins: { columns: { id: true, binNumber: true } } },
      });
      if (!activeBinSet)
        return { message: "No active set found.", success: false };
      const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
      if (existing) await tx.delete(bins).where(eq(bins.id, existing.id));
      return {
        message: "Successfully cleared bin config.",
        success: true,
        data: null,
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq, and }) =>
          and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      await tx
        .update(binSets)
        .set({ name, updatedAt: new Date() })
        .where(eq(binSets.id, target.id));
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

async function _resetAutoAssignBins(tx: Transaction, binSetId: number) {
  await tx
    .update(bins)
    .set({ rules: emptyRules(), updatedAt: new Date() })
    .where(and(eq(bins.binSet, binSetId), eq(bins.isCatchAll, false)));
}

router.put("/:guid/auto-assign", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  const { field } = await c.req.json<{ field: string | null }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq, and }) =>
          and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
        columns: { id: true, guid: true, autoAssignField: true },
      });
      if (!target) return { message: "Set not found.", success: false };

      if (field && field !== target.autoAssignField) {
        await _snapshotBinSet(tx, target.id, target.guid!, orgId);
        await _resetAutoAssignBins(tx, target.id);
      }

      await tx
        .update(binSets)
        .set({ autoAssignField: field, updatedAt: new Date() })
        .where(eq(binSets.id, target.id));
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/:guid/auto-assign/reset", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq, and }) =>
          and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
        columns: { id: true, guid: true },
      });
      if (!target) return { message: "Set not found.", success: false };

      await _snapshotBinSet(tx, target.id, target.guid!, orgId);
      await _resetAutoAssignBins(tx, target.id);
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq, and }) =>
          and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      await tx.delete(bins).where(eq(bins.binSet, target.id));
      await tx.delete(binSets).where(eq(binSets.id, target.id));
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.get("/history", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const setGuid = c.req.query("setGuid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.binSetAudit.findMany({
        where: setGuid
          ? (t, { eq, and }) =>
              and(eq(t.binSetGuid, setGuid), eq(t.orgId, orgId))
          : (t, { eq }) => eq(t.orgId, orgId),
        columns: {
          guid: true,
          binSetGuid: true,
          snapshot: true,
          createdAt: true,
        },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 20,
      });
      return {
        success: true,
        message: "Loaded history.",
        data: rows.map((r) => ({
          guid: r.guid!,
          binSetGuid: r.binSetGuid,
          snapshot: r.snapshot as BinConfig[],
          createdAt: r.createdAt.toISOString(),
        })),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/history/:guid/revert", requireAuth, requireOrg, async (c) => {
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
      return _loadSets(tx, orgId);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as sortBinsRouter };
