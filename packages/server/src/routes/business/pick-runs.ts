import {
  buildOrderSortPresetBins,
  buildSorterPickPresetBins,
  computeBinCount,
  hasEveryOrderBin,
  IMPLICIT_ORDER_REF,
  ORDER_PICK_LINK_MAX_ORDERS,
  orderBinsError,
  orderSortCatchAllBin,
  orderSortRefsOf,
  orderSortPresetGameKeys,
  pickOrderGroups,
  sorterPickScanIds,
  toPickList,
  SET_NAME_MAX_LENGTH,
  type ActivityAction,
  type OrderBins,
  type OrderLine,
  type OrderSortPreset,
  type OrderSortPresetBin,
  type OrderSortPresetResult,
  type PickOrderGroup,
  type PreviousSortPresetsResult,
  type PullSheetEntry,
  type SorterPickApplyInput,
  type SorterPickApplyResult,
  type SorterPickCleanupResult,
  type SorterPickReleaseInput,
  type SorterPickReleaseResult,
  type SorterPickRunInput,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import {
  bins,
  binSets,
  devices,
  fulfilmentOrders,
  games,
  orgActivityLog,
  storageLocations,
} from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { BUSINESS_FORBIDDEN_RESULT, BUSINESS_UPGRADE_REQUIRED_RESULT } from "../../lib/constants/business";
import { UUID_PATTERN } from "../../lib/constants/validation";
import {
  allocateOrderLines,
  loadPullSheet,
  orderLinesWithPicks,
  toOrderBins,
  toOrderLines,
} from "../../lib/orders";
import { removeCardsFromLocations } from "../storage-locations/shared";
import { ORDERS_CHANGED_EVENT } from "@magic-vault/shared";
import { emitToOrg } from "../../lib/session-stream";
import { deactivatePresetWorkflows } from "../../lib/preset-workflows";
import {
  activeBinSetWhere,
  binInsertValues,
  binSetNameTaken,
  emptyRules,
  getModuleCount,
  normalizeOverflowBins,
  resetPickList,
} from "../bins/shared";
import { businessQuery, notFound, readJson } from "./shared";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { PICK_NOT_FOUND_MESSAGE } from "../../lib/constants/business";

async function sortPresetName(tx: Transaction, orgId: string, gameId: number, baseName: string) {
  let name = baseName.slice(0, SET_NAME_MAX_LENGTH);
  for (let copy = 2; await binSetNameTaken(tx, orgId, gameId, name); copy++) {
    const suffix = ` (${copy})`;
    name = `${baseName.slice(0, SET_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
  }
  return name;
}

function readGuidList(value: unknown): string[] {
  return (Array.isArray(value) ? value : [])
    .filter(
      (guid): guid is string =>
        typeof guid === "string" && UUID_PATTERN.test(guid),
    )
    .slice(0, ORDER_PICK_LINK_MAX_ORDERS);
}

async function loadPickRunOrders(tx: Transaction, orgId: string, orderGuids: string[]) {
  return tx
    .select({
      id: fulfilmentOrders.id,
      guid: fulfilmentOrders.guid,
      name: fulfilmentOrders.name,
      lines: fulfilmentOrders.lines,
      orderBins: fulfilmentOrders.orderBins,
    })
    .from(fulfilmentOrders)
    .where(
      and(
        eq(fulfilmentOrders.orgId, orgId),
        eq(fulfilmentOrders.isDeleted, false),
        eq(fulfilmentOrders.status, "open"),
        inArray(fulfilmentOrders.guid, orderGuids),
      ),
    )
    .orderBy(fulfilmentOrders.name);
}

/**
 * Bin count for a pick run: the chosen sorter's module count when one is
 * selected, otherwise the org-wide max across all devices.
 */
async function resolveRunBinCount(
  tx: Transaction,
  orgId: string,
  deviceGuid: string | null,
): Promise<number | null> {
  if (!deviceGuid) {
    return computeBinCount(await getModuleCount(tx, orgId));
  }
  const [device] = await tx
    .select({ moduleCount: devices.moduleCount })
    .from(devices)
    .where(
      and(
        eq(devices.guid, deviceGuid),
        eq(devices.orgId, orgId),
        eq(devices.isDeleted, false),
      ),
    );
  if (!device) return null;
  return computeBinCount(device.moduleCount);
}

function readGuidParam(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

async function createPickRunPresets(
  tx: Transaction,
  orgId: string,
  userId: string,
  groups: PickOrderGroup[],
  baseName: string,
  buildBins: (gameKey: string) => OrderSortPresetBin[],
  action: ActivityAction,
  summary: string,
  logDetails: Record<string, unknown>,
): Promise<OrderSortPreset[]> {
  const gameKeys = orderSortPresetGameKeys(groups);
  if (gameKeys.length === 0) return [];
  const gameRows = await tx
    .select({ id: games.id, key: games.key, name: games.name })
    .from(games)
    .where(and(inArray(games.key, gameKeys), eq(games.isDeleted, false)));
  const presets: OrderSortPreset[] = [];
  for (const gameKey of gameKeys) {
    const game = gameRows.find((candidate) => candidate.key === gameKey);
    if (!game) continue;
    const name = await sortPresetName(
      tx,
      orgId,
      game.id,
      gameKeys.length > 1 ? `${baseName} ${game.name}` : baseName,
    );
    await tx
      .update(binSets)
      .set({ isActive: false })
      .where(activeBinSetWhere(binSets, orgId, game.id));
    await deactivatePresetWorkflows(tx, orgId, game.id);
    const [preset] = await tx
      .insert(binSets)
      .values({
        name,
        isActive: true,
        skipSaving: true,
        gameId: game.id,
        orgId,
      })
      .returning({ id: binSets.id, guid: binSets.guid });
    await tx.insert(bins).values(
      buildBins(gameKey).map((bin) => ({
        ...binInsertValues(
          {
            binNumber: bin.binNumber,
            isCatchAll: bin.isCatchAll,
            rules: emptyRules(),
          },
          preset.id,
          orgId,
        ),
        pickList: bin.pickList,
      })),
    );
    await normalizeOverflowBins(tx, preset.id);
    presets.push({ guid: preset.guid!, name, gameKey });
  }
  if (presets.length > 0) {
    await logActivity(tx, {
      orgId,
      userId,
      action,
      summary,
      details: { ...logDetails, presetGuids: presets.map((preset) => preset.guid) },
    });
  }
  return presets;
}

function orderNameList(rows: { name: string }[]) {
  return rows.length > 2
    ? `${rows[0].name} +${rows.length - 1}`
    : rows.map((row) => row.name).join(", ");
}

/**
 * Re-activates a previous sort preset instead of creating a new one: same
 * bins, same pick lists with their found counts, so an interrupted sort
 * continues where it stopped.
 */
async function reuseSortPreset(
  tx: Transaction,
  orgId: string,
  userId: string,
  presetGuid: string,
): Promise<OrderSortPresetResult | null> {
  const [set] = await tx
    .select({
      id: binSets.id,
      guid: binSets.guid,
      name: binSets.name,
      gameId: binSets.gameId,
      gameKey: games.key,
    })
    .from(binSets)
    .innerJoin(games, eq(games.id, binSets.gameId))
    .where(
      and(
        eq(binSets.guid, presetGuid),
        eq(binSets.orgId, orgId),
        eq(binSets.isDeleted, false),
        eq(binSets.skipSaving, true),
      ),
    );
  if (!set) return null;
  await tx
    .update(binSets)
    .set({ isActive: false })
    .where(activeBinSetWhere(binSets, orgId, set.gameId));
  await deactivatePresetWorkflows(tx, orgId, set.gameId);
  await tx.update(binSets).set({ isActive: true }).where(eq(binSets.id, set.id));
  await logActivity(tx, {
    orgId,
    userId,
    action: "order.sortPresetReused",
    summary: set.name,
    details: { presetGuid: set.guid },
  });
  const data: OrderSortPresetResult = {
    presets: [{ guid: set.guid!, name: set.name, gameKey: set.gameKey }],
  };
  return data;
}

export const pickRunsRoute = new Hono<AppEnv>()
  .get(
    "/pick-runs/previous-presets",
    requireAuth,
    requireOrg,
    (c) =>
      businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const orderGuids = readGuidList(
        c.req.query("orderGuids")?.split(",") ?? [],
      );
      if (orderGuids.length === 0) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      // presets created for any of these picks (both run kinds), still alive
      // but not active — the active preset is the run you would continue anyway
      const entries = await tx
        .select({ presetGuids: orgActivityLog.details })
        .from(orgActivityLog)
        .where(
          and(
            eq(orgActivityLog.orgId, orgId),
            inArray(orgActivityLog.action, [
              "order.sortPresetCreated",
              "order.sorterPickCreated",
            ]),
            sql`${orgActivityLog.details}->'orderGuids' ?| ${sql.param(orderGuids)}`,
          ),
        )
        .orderBy(desc(orgActivityLog.createdAt))
        .limit(20);
      const guids = [
        ...new Set(
          entries.flatMap((entry) => {
            const details = entry.presetGuids as {
              presetGuids?: unknown;
            } | null;
            return Array.isArray(details?.presetGuids)
              ? (details!.presetGuids as unknown[]).filter(
                  (guid): guid is string =>
                    typeof guid === "string" && UUID_PATTERN.test(guid),
                )
              : [];
          }),
        ),
      ].slice(0, 20);
      if (guids.length === 0) {
        const data: PreviousSortPresetsResult = { presets: [] };
        return { success: true, data };
      }
      const rows = await tx
        .select({
          guid: binSets.guid,
          name: binSets.name,
          gameKey: games.key,
          createdAt: binSets.createdAt,
          isActive: binSets.isActive,
        })
        .from(binSets)
        .innerJoin(games, eq(games.id, binSets.gameId))
        .where(
          and(
            eq(binSets.orgId, orgId),
            eq(binSets.isDeleted, false),
            eq(binSets.skipSaving, true),
            inArray(binSets.guid, guids),
          ),
        )
        .orderBy(desc(binSets.createdAt));
      // the currently active preset is the run you would continue anyway
      const presets = rows
        .filter((row) => !row.isActive && row.guid)
        .map((row) => ({
          guid: row.guid!,
          name: row.name,
          gameKey: row.gameKey,
          createdAt: row.createdAt?.toISOString() ?? "",
        }));
      const data: PreviousSortPresetsResult = { presets };
      return { success: true, data };
        }),
  )
  .post(
    "/pick-runs/sort-preset",
    requireAuth,
    requireOrg,
    (c) =>
    businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const body = await readJson<{
        orderGuids?: unknown;
        deviceGuid?: unknown;
        previousPresetGuid?: unknown;
      }>(c);
      const orderGuids = readGuidList(body.orderGuids);
      if (orderGuids.length === 0) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const previousPresetGuid = readGuidParam(body.previousPresetGuid);
      if (previousPresetGuid) {
        const reused = await reuseSortPreset(
          tx,
          orgId,
          c.get("userId"),
          previousPresetGuid,
        );
        if (!reused) return notFound(PICK_NOT_FOUND_MESSAGE);
        return { success: true, data: reused };
      }
      const rows = await loadPickRunOrders(tx, orgId, orderGuids);
      if (rows.length === 0) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const binCount = await resolveRunBinCount(
        tx,
        orgId,
        readGuidParam(body.deviceGuid),
      );
      if (binCount == null) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const groups: PickOrderGroup[] = [];
      for (const row of rows) {
        const lines = toOrderLines(row.lines);
        const orderBins = toOrderBins(row.orderBins, lines);
        if (
          !hasEveryOrderBin(orderSortRefsOf(lines), orderBins) ||
          orderBinsError(orderBins, binCount)
        ) {
          return {
            success: false,
            message: `Give every order in ${row.name} a sorter bin first.`,
          };
        }
        groups.push(
          ...pickOrderGroups(
            lines,
            await loadPullSheet(tx, orgId, lines),
            orderBins,
          ),
        );
      }
      const baseName = orderNameList(rows);
      const presets = await createPickRunPresets(
        tx,
        orgId,
        c.get("userId"),
        groups,
        baseName,
        (gameKey) => buildOrderSortPresetBins(groups, gameKey, binCount),
        "order.sortPresetCreated",
        baseName,
        { orderGuids: rows.map((row) => row.guid) },
      );
      if (presets.length === 0) {
        return {
          success: false,
          message: "None of the orders have cards in stock.",
        };
      }
      emitToOrg(orgId, ORDERS_CHANGED_EVENT, {});
      const data: OrderSortPresetResult = { presets };
      return { success: true, data };
    }),
  )
  .post(
    "/pick-runs/sorter-pick",
    requireAuth,
    requireOrg,
    (c) =>
    businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const body = await readJson<Partial<SorterPickRunInput>>(c);
      const orderGuids = readGuidList(body.orderGuids);
      const locationGuid =
        typeof body.locationGuid === "string" && UUID_PATTERN.test(body.locationGuid)
          ? body.locationGuid
          : null;
      if (orderGuids.length === 0 || !locationGuid) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const [location] = await tx
        .select({ id: storageLocations.id, name: storageLocations.name })
        .from(storageLocations)
        .where(
          and(
            eq(storageLocations.guid, locationGuid),
            eq(storageLocations.orgId, orgId),
            eq(storageLocations.isDeleted, false),
          ),
        );
      if (!location) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const rows = await loadPickRunOrders(tx, orgId, orderGuids);
      if (rows.length === 0) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const binCount = await resolveRunBinCount(
        tx,
        orgId,
        readGuidParam(body.deviceGuid),
      );
      if (binCount == null) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const scoped: {
        row: (typeof rows)[number];
        lines: OrderLine[];
        existingBins: OrderBins;
        pullSheet: PullSheetEntry[];
        refs: string[];
      }[] = [];
      for (const row of rows) {
        const lines = toOrderLines(row.lines);
        const existingBins = toOrderBins(row.orderBins, lines);
        const pullSheet = await loadPullSheet(tx, orgId, lines);
        const inLocation = pullSheet.filter(
          (entry) => entry.locationGuid === locationGuid,
        );
        const refs = [
          ...new Set(
            inLocation.map(
              (entry) =>
                lines[entry.lineIndex]?.orderRef?.trim() || IMPLICIT_ORDER_REF,
            ),
          ),
        ];
        if (refs.length === 0) continue;
        scoped.push({ row, lines, existingBins, pullSheet, refs });
      }
      if (scoped.length === 0) {
        return {
          success: false,
          message: `No cards from ${location.name} are part of this batch.`,
        };
      }
      // assign one bin per order group: real order references shared across
      // picks keep one bin, the implicit whole-order group gets its own
      const usedBins = new Set<number>();
      const catchAllBin = orderSortCatchAllBin(binCount);
      const assignedByRow: { item: (typeof scoped)[number]; bins: OrderBins }[] =
        [];
      for (const item of scoped) {
        const keys = item.refs.map((ref) =>
          ref === IMPLICIT_ORDER_REF ? `implicit:${item.row.guid}` : ref,
        );
        const bins: OrderBins = {};
        keys.forEach((key, index) => {
          const existing = item.existingBins[item.refs[index]];
          if (
            existing != null &&
            existing >= 1 &&
            existing < catchAllBin &&
            !usedBins.has(existing)
          ) {
            bins[key] = existing;
          }
        });
        for (const key of keys) {
          if (bins[key] != null) continue;
          let next = 1;
          while (
            next < catchAllBin &&
            (usedBins.has(next) || Object.values(bins).includes(next))
          ) {
            next++;
          }
          if (next >= catchAllBin) break;
          bins[key] = next;
        }
        if (!keys.every((key) => bins[key] != null)) {
          return {
            success: false,
            message: `The sorter has no free bin left for every order in ${location.name}.`,
          };
        }
        for (const bin of Object.values(bins)) usedBins.add(bin);
        assignedByRow.push({
          item,
          bins: Object.fromEntries(
            keys.map((key, index) => [item.refs[index], bins[key]]),
          ),
        });
      }
      for (const { item, bins } of assignedByRow) {
        const runRefs = new Set(Object.keys(bins));
        const usedByRun = new Set(Object.values(bins));
        const others = Object.fromEntries(
          Object.entries(item.existingBins).filter(
            ([ref, bin]) => !runRefs.has(ref) && !usedByRun.has(bin),
          ),
        );
        const nextBins: OrderBins = { ...others, ...bins };
        if (JSON.stringify(nextBins) !== JSON.stringify(item.existingBins)) {
          await tx
            .update(fulfilmentOrders)
            .set({ orderBins: nextBins, updatedAt: new Date() })
            .where(eq(fulfilmentOrders.id, item.row.id));
        }
      }
      const groups = assignedByRow.flatMap(({ item, bins }) =>
        pickOrderGroups(item.lines, item.pullSheet, bins),
      );
      const presets = await createPickRunPresets(
        tx,
        orgId,
        c.get("userId"),
        groups.map((group) => ({
          ...group,
          entries: group.entries.filter(
            (entry) => entry.locationGuid === locationGuid,
          ),
        })),
        `${location.name} · ${orderNameList(scoped.map((item) => item.row))}`,
        (gameKey) =>
          buildSorterPickPresetBins(groups, locationGuid, gameKey, binCount),
        "order.sorterPickCreated",
        location.name,
        {
          orderGuids: scoped.map((item) => item.row.guid),
          locationGuid,
        },
      );
      if (presets.length === 0) {
        return {
          success: false,
          message: `No cards from ${location.name} are part of this batch.`,
        };
      }
      emitToOrg(orgId, ORDERS_CHANGED_EVENT, {});
      const data: OrderSortPresetResult = { presets };
      return { success: true, data };
    }),
  )
  .post(
    "/pick-runs/sorter-pick/apply",
    requireAuth,
    requireOrg,
    (c) =>
    businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      const body = await readJson<Partial<SorterPickApplyInput>>(c);
      const orderGuids = readGuidList(body.orderGuids);
      const locationGuid =
        typeof body.locationGuid === "string" && UUID_PATTERN.test(body.locationGuid)
          ? body.locationGuid
          : null;
      const presetGuids = readGuidList(body.presetGuids);
      if (orderGuids.length === 0 || !locationGuid || presetGuids.length === 0) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const [location] = await tx
        .select({ id: storageLocations.id, name: storageLocations.name })
        .from(storageLocations)
        .where(
          and(
            eq(storageLocations.guid, locationGuid),
            eq(storageLocations.orgId, orgId),
            eq(storageLocations.isDeleted, false),
          ),
        );
      if (!location) {
        return notFound(PICK_NOT_FOUND_MESSAGE);
      }
      const sets = await tx
        .select({ id: binSets.id })
        .from(binSets)
        .where(
          and(
            eq(binSets.orgId, orgId),
            inArray(binSets.guid, presetGuids),
            eq(binSets.isDeleted, false),
          ),
        );
      const binRows = await tx
        .select({
          id: bins.id,
          binNumber: bins.binNumber,
          pickList: bins.pickList,
        })
        .from(bins)
        .where(
          and(
            inArray(
              bins.binSet,
              sets.map((set) => set.id),
            ),
            eq(bins.isDeleted, false),
          ),
        );
      const foundByBin = new Map<number, Record<string, number>>();
      for (const binRow of binRows) {
        const pickList = toPickList(binRow.pickList);
        if (!pickList) continue;
        const found: Record<string, number> = {};
        for (const entry of pickList.entries) {
          if (entry.found > 0) found[entry.name] = entry.found;
        }
        if (Object.keys(found).length > 0) foundByBin.set(binRow.binNumber, found);
      }
      if (foundByBin.size === 0) {
        return {
          success: false,
          message: "The sorter has not picked any cards from this box yet.",
        };
      }
      const rows = await loadPickRunOrders(tx, orgId, orderGuids);
      const pickedByOrder: Record<string, string[]> = {};
      let pickedCount = 0;
      for (const row of rows) {
        const lines = toOrderLines(row.lines);
        const orderBins = toOrderBins(row.orderBins, lines);
        const binsOfOrder = [
          ...new Set(
            orderSortRefsOf(lines)
              .map((ref) => orderBins[ref])
              .filter((bin): bin is number => bin != null && foundByBin.has(bin)),
          ),
        ].sort((left, right) => left - right);
        if (binsOfOrder.length === 0) continue;
        const foundByName: Record<string, number> = {};
        for (const bin of binsOfOrder) {
          for (const [name, found] of Object.entries(foundByBin.get(bin)!)) {
            foundByName[name] = (foundByName[name] ?? 0) + found;
          }
        }
        const pullSheet = await loadPullSheet(tx, orgId, lines);
        const { scanIds, consumedByName } = sorterPickScanIds(
          pullSheet,
          foundByName,
          locationGuid,
        );
        if (!row.guid || scanIds.length === 0) continue;
        const nextLines = orderLinesWithPicks(lines, new Set(scanIds), true);
        await tx
          .update(fulfilmentOrders)
          .set({ lines: nextLines, updatedAt: new Date() })
          .where(eq(fulfilmentOrders.id, row.id));
        pickedByOrder[row.guid] = scanIds;
        pickedCount += scanIds.length;
        const consumedLeft: Record<string, number> = { ...consumedByName };
        for (const bin of binsOfOrder) {
          const remaining = foundByBin.get(bin)!;
          for (const [name, count] of Object.entries(remaining)) {
            const left = consumedLeft[name] ?? 0;
            if (left <= 0) continue;
            const take = Math.min(count, left);
            remaining[name] = count - take;
            consumedLeft[name] = left - take;
          }
        }
      }
      for (const binRow of binRows) {
        if (!binRow.pickList) continue;
        await tx
          .update(bins)
          .set({ pickList: resetPickList(binRow.pickList) })
          .where(eq(bins.id, binRow.id));
      }
      if (pickedCount === 0) {
        return {
          success: false,
          message: "The sorter has not picked any cards from this box yet.",
        };
      }
      await logActivity(tx, {
        orgId,
        userId,
        action: "order.sorterPickApplied",
        summary: location.name,
        details: {
          orderGuids: Object.keys(pickedByOrder),
          locationGuid,
          presetGuids,
          pickedCount,
        },
      });
      emitToOrg(orgId, ORDERS_CHANGED_EVENT, {});
      const data: SorterPickApplyResult = { pickedByOrder };
      return { success: true, data };
    }),
  )
  .post(
    "/pick-runs/presets/cleanup",
    requireAuth,
    requireOrg,
    (c) =>
      businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const used = await tx
        .select({ id: binSets.id, name: binSets.name })
        .from(binSets)
        .where(
          and(
            eq(binSets.orgId, orgId),
            eq(binSets.isDeleted, false),
            eq(binSets.isActive, false),
            eq(binSets.skipSaving, true),
          ),
        );
      if (used.length > 0) {
        await tx
          .update(binSets)
          .set({ isDeleted: true })
          .where(
            inArray(
              binSets.id,
              used.map((set) => set.id),
            ),
          );
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "order.sorterPickPresetsCleaned",
          summary: String(used.length),
          details: { removed: used.length, names: used.map((set) => set.name) },
        });
      }
      const data: SorterPickCleanupResult = { removed: used.length };
      return { success: true, data };
        }),
  )
  .post(
    "/pick-runs/sorter-pick/release",
    requireAuth,
    requireOrg,
    (c) =>
      businessQuery(c, async (tx, access) => {
        if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
        if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
        const orgId = c.get("orgId");
        const body = await readJson<Partial<SorterPickReleaseInput>>(c);
        const orderGuid =
          typeof body.orderGuid === "string" && UUID_PATTERN.test(body.orderGuid)
            ? body.orderGuid
            : null;
        const scanId =
          typeof body.scanId === "string" && UUID_PATTERN.test(body.scanId)
            ? body.scanId
            : null;
        if (!orderGuid || !scanId) {
          return notFound(PICK_NOT_FOUND_MESSAGE);
        }
        await tx.execute(sql`
          SELECT 1 FROM fulfilment_orders
          WHERE guid = ${orderGuid} AND org_id = ${orgId} AND is_deleted = false
          FOR UPDATE
        `);
        const row = await tx
          .select({
            id: fulfilmentOrders.id,
            guid: fulfilmentOrders.guid,
            name: fulfilmentOrders.name,
            status: fulfilmentOrders.status,
            lines: fulfilmentOrders.lines,
            orderBins: fulfilmentOrders.orderBins,
          })
          .from(fulfilmentOrders)
          .where(
            and(
              eq(fulfilmentOrders.orgId, orgId),
              eq(fulfilmentOrders.guid, orderGuid),
              eq(fulfilmentOrders.isDeleted, false),
            ),
          )
          .limit(1);
        const order = row[0];
        if (!order) return notFound(PICK_NOT_FOUND_MESSAGE);
        if (order.status !== "open") {
          return { success: false, message: "This pick is closed." };
        }
        const lines = toOrderLines(order.lines);
        if (!lines.some((line) => line.allocations.includes(scanId))) {
          return {
            success: false,
            message: "That copy is not allocated to this pick.",
          };
        }
        const released = lines.map((line) => ({
          ...line,
          allocations: line.allocations.filter((id) => id !== scanId),
          picked: line.picked.filter((id) => id !== scanId),
        }));
        const allocated = await allocateOrderLines(
          tx,
          orgId,
          order.id,
          released,
          new Set([scanId]),
        );
        await tx
          .update(fulfilmentOrders)
          .set({
            lines: allocated,
            orderBins: toOrderBins(order.orderBins, allocated),
            updatedAt: new Date(),
          })
          .where(eq(fulfilmentOrders.id, order.id));
        // the copy demonstrably isn't in the box it was filed under
        const unfiled = await removeCardsFromLocations(tx, orgId, [scanId]);
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "order.updated",
          summary: order.name,
          details: {
            orderGuid: order.guid,
            releasedScanId: scanId,
            unfiledFromLocation: unfiled > 0,
          },
        });
        emitToOrg(orgId, ORDERS_CHANGED_EVENT, {});
        const data: SorterPickReleaseResult = {
          released: true,
          unfiled: unfiled > 0,
        };
        return { success: true, data };
      }),
  );
