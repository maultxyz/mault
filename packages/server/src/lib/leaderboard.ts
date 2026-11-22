import {
  LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM,
  LEADERBOARD_METRIC_PARAM,
  LEADERBOARD_PERIOD_DAYS,
  LEADERBOARD_PERIOD_PARAM,
  LEADERBOARD_SIZE,
  leaderboardMetricCountsSelfHosted,
  parseLeaderboardMetric,
  parseLeaderboardPeriod,
  type Leaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardQuery,
} from "@magic-vault/shared";
import { eq, sql, type SQL } from "drizzle-orm";
import { authProvider } from "../auth";
import { db, type Transaction } from "../db";
import {
  leaderboardSnapshots,
  orgSettings,
  scanStats,
  selfHostedDailyScanStats,
} from "../db/schema";
import { createCachedValue } from "./cached-value";
import {
  LEADERBOARD_CARDS_PER_HOUR_WINDOW_MINUTES,
  LEADERBOARD_OPT_IN_CACHE_MS,
  LEADERBOARD_ORG_NAMES_CACHE_MAX_ENTRIES,
  LEADERBOARD_ORG_NAMES_CACHE_MS,
  LEADERBOARD_SNAPSHOT_LOCK_PREFIX,
} from "./constants/leaderboard";
import { createKeyedCache } from "./keyed-cache";
import type {
  CachedLeaderboardRanking,
  OrgScanCount,
  StoredOrgScanCount,
} from "./interfaces/leaderboard";

const cachedRankings = new Map<string, CachedLeaderboardRanking>();
const inFlightRankings = new Map<string, Promise<OrgScanCount[]>>();
const optedInOrgIdsCache = createCachedValue(loadOptedInOrgIds);
const orgNamesCache = createKeyedCache<Map<string, string>>(
  LEADERBOARD_ORG_NAMES_CACHE_MS,
  LEADERBOARD_ORG_NAMES_CACHE_MAX_ENTRIES,
);

function utcDayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function periodStartOf(period: LeaderboardPeriod, day: string): Date | null {
  if (period === "allTime") return null;
  const start = new Date(`${day}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - LEADERBOARD_PERIOD_DAYS[period]);
  return start;
}

function snapshotVariantOf(query: LeaderboardQuery): string {
  const selfHosted = query.includeSelfHosted ? "withSelfHosted" : "hostedOnly";
  return `${query.metric}:${query.period}:${selfHosted}`;
}

export function parseLeaderboardQuery(
  readQueryParam: (name: string) => string | undefined,
): LeaderboardQuery {
  return {
    metric: parseLeaderboardMetric(readQueryParam(LEADERBOARD_METRIC_PARAM)),
    period: parseLeaderboardPeriod(readQueryParam(LEADERBOARD_PERIOD_PARAM)),
    includeSelfHosted:
      readQueryParam(LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM) === "true",
  };
}

function resolveLeaderboardQuery(query: LeaderboardQuery): LeaderboardQuery {
  return {
    ...query,
    includeSelfHosted:
      query.includeSelfHosted && leaderboardMetricCountsSelfHosted(query.metric),
  };
}

function scannedSinceSql(start: Date | null): SQL {
  return start
    ? sql`AND ${scanStats.scannedAt} >= ${start.toISOString()}::timestamp`
    : sql``;
}

function rankingSql(query: LeaderboardQuery, start: Date | null): SQL {
  if (query.metric === "cardsPerHour") {
    const windowMinutes = sql.raw(String(LEADERBOARD_CARDS_PER_HOUR_WINDOW_MINUTES));
    const windowsPerHour = sql.raw(String(60 / LEADERBOARD_CARDS_PER_HOUR_WINDOW_MINUTES));
    return sql`
      WITH scans_in_window AS (
        SELECT
          ${scanStats.orgId} AS org_id,
          count(*) OVER (
            PARTITION BY ${scanStats.orgId}, ${scanStats.deviceGuid}
            ORDER BY ${scanStats.scannedAt}
            RANGE BETWEEN make_interval(mins => ${windowMinutes}) PRECEDING AND CURRENT ROW
          ) AS scan_count
        FROM ${scanStats}
        WHERE ${scanStats.orgId} IS NOT NULL
          AND ${scanStats.deviceGuid} IS NOT NULL
          ${scannedSinceSql(start)}
      )
      SELECT
        org_id,
        (max(scan_count) * ${windowsPerHour})::bigint AS scan_count,
        0::bigint AS self_hosted_scan_count
      FROM scans_in_window
      GROUP BY org_id
      ORDER BY scan_count DESC, org_id
    `;
  }
  if (!query.includeSelfHosted) {
    return sql`
      SELECT
        ${scanStats.orgId} AS org_id,
        count(*)::bigint AS scan_count,
        0::bigint AS self_hosted_scan_count
      FROM ${scanStats}
      WHERE ${scanStats.orgId} IS NOT NULL ${scannedSinceSql(start)}
      GROUP BY ${scanStats.orgId}
      ORDER BY scan_count DESC, org_id
    `;
  }
  const selfHostedSince = start
    ? sql`WHERE ${selfHostedDailyScanStats.day} >= ${utcDayOf(start)}::date`
    : sql``;
  return sql`
    WITH hosted AS (
      SELECT ${scanStats.orgId} AS org_id, count(*) AS scan_count
      FROM ${scanStats}
      WHERE ${scanStats.orgId} IS NOT NULL ${scannedSinceSql(start)}
      GROUP BY ${scanStats.orgId}
    ),
    self_hosted AS (
      SELECT ${selfHostedDailyScanStats.orgId} AS org_id, sum(${selfHostedDailyScanStats.scanCount}) AS scan_count
      FROM ${selfHostedDailyScanStats}
      ${selfHostedSince}
      GROUP BY ${selfHostedDailyScanStats.orgId}
    ),
    combined AS (
      SELECT h.org_id, h.scan_count, 0::bigint AS self_hosted_scan_count FROM hosted h
      UNION ALL
      SELECT s.org_id, 0::bigint, s.scan_count FROM self_hosted s
    )
    SELECT
      c.org_id,
      sum(c.scan_count + c.self_hosted_scan_count)::bigint AS scan_count,
      sum(c.self_hosted_scan_count)::bigint AS self_hosted_scan_count
    FROM combined c
    GROUP BY c.org_id
    HAVING sum(c.scan_count + c.self_hosted_scan_count) > 0
    ORDER BY scan_count DESC, c.org_id
  `;
}

async function computeRankedScanCounts(
  tx: Transaction,
  query: LeaderboardQuery,
  day: string,
): Promise<OrgScanCount[]> {
  const result = await tx.execute(rankingSql(query, periodStartOf(query.period, day)));
  return (
    result.rows as {
      org_id: string;
      scan_count: string | number;
      self_hosted_scan_count: string | number;
    }[]
  ).map((row) => ({
    orgId: row.org_id,
    scanCount: Number(row.scan_count),
    selfHostedScanCount: Number(row.self_hosted_scan_count),
  }));
}

function fromStoredRanking(payload: unknown): OrgScanCount[] {
  return (payload as StoredOrgScanCount[]).map(
    ([orgId, scanCount, selfHostedScanCount]) => ({
      orgId,
      scanCount,
      selfHostedScanCount,
    }),
  );
}

function toStoredRanking(ranked: OrgScanCount[]): StoredOrgScanCount[] {
  return ranked.map((row) => [row.orgId, row.scanCount, row.selfHostedScanCount]);
}

async function readTodaysSnapshot(
  executor: typeof db | Transaction,
  variant: string,
  day: string,
): Promise<OrgScanCount[] | null> {
  const [row] = await executor
    .select({ day: leaderboardSnapshots.day, payload: leaderboardSnapshots.payload })
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.variant, variant))
    .limit(1);
  return row?.day === day ? fromStoredRanking(row.payload) : null;
}

async function loadOrComputeSnapshot(
  query: LeaderboardQuery,
  variant: string,
  day: string,
): Promise<OrgScanCount[]> {
  const stored = await readTodaysSnapshot(db, variant, day);
  if (stored) return stored;
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`${LEADERBOARD_SNAPSHOT_LOCK_PREFIX}${variant}`}))`,
    );
    const storedWhileWaiting = await readTodaysSnapshot(tx, variant, day);
    if (storedWhileWaiting) return storedWhileWaiting;
    const computeStartedAt = Date.now();
    const ranked = await computeRankedScanCounts(tx, query, day);
    const snapshot = {
      day,
      payload: toStoredRanking(ranked),
      computedAt: new Date(),
      computeDurationMs: Date.now() - computeStartedAt,
    };
    await tx
      .insert(leaderboardSnapshots)
      .values({ variant, ...snapshot })
      .onConflictDoUpdate({ target: leaderboardSnapshots.variant, set: snapshot });
    return ranked;
  });
}

function getRankedScanCounts(query: LeaderboardQuery): Promise<OrgScanCount[]> {
  const day = utcDayOf(new Date());
  const variant = snapshotVariantOf(query);
  const cached = cachedRankings.get(variant);
  if (cached?.day === day) return Promise.resolve(cached.ranked);
  const inFlightKey = `${variant}@${day}`;
  const inFlight = inFlightRankings.get(inFlightKey);
  if (inFlight) return inFlight;
  const load = loadOrComputeSnapshot(query, variant, day)
    .then((ranked) => {
      cachedRankings.set(variant, { day, ranked });
      return ranked;
    })
    .finally(() => {
      inFlightRankings.delete(inFlightKey);
    });
  inFlightRankings.set(inFlightKey, load);
  return load;
}

async function loadOptedInOrgIds(): Promise<Set<string>> {
  const rows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(eq(orgSettings.leaderboardOptIn, true));
  return new Set(rows.map((row) => row.orgId));
}

function getOptedInOrgIds(): Promise<Set<string>> {
  return optedInOrgIdsCache.get(LEADERBOARD_OPT_IN_CACHE_MS, {
    servesStaleWhileRefreshing: true,
  });
}

export function forgetLeaderboardOptIns(): void {
  optedInOrgIdsCache.invalidate();
}

function getOrganisationNames(orgIds: string[]): Promise<Map<string, string>> {
  if (!orgIds.length) return Promise.resolve(new Map());
  const sortedOrgIds = [...orgIds].sort();
  return orgNamesCache.get(sortedOrgIds.join(","), () =>
    authProvider.getOrganisationNames(sortedOrgIds),
  );
}

function rankOf(scanCount: number, ranked: OrgScanCount[]): number {
  const firstNotAbove = ranked.findIndex((row) => row.scanCount <= scanCount);
  return (firstNotAbove === -1 ? ranked.length : firstNotAbove) + 1;
}

function toEntry(
  row: OrgScanCount,
  ranked: OrgScanCount[],
  optedInOrgIds: Set<string>,
  names: Map<string, string>,
  viewerOrgId: string | null,
): LeaderboardEntry {
  const isOwnOrg = row.orgId === viewerOrgId;
  const optedIn = optedInOrgIds.has(row.orgId);
  return {
    rank: rankOf(row.scanCount, ranked),
    name: optedIn || isOwnOrg ? (names.get(row.orgId) ?? null) : null,
    scanCount: row.scanCount,
    isOwnOrg,
    isAnonymous: !optedIn,
    selfHostedScanCount: row.selfHostedScanCount,
  };
}

export async function loadTopLeaderboardEntries(
  requestedQuery: LeaderboardQuery,
): Promise<LeaderboardEntry[]> {
  const ranked = await getRankedScanCounts(resolveLeaderboardQuery(requestedQuery));
  const top = ranked.slice(0, LEADERBOARD_SIZE);
  const optedInOrgIds = await getOptedInOrgIds();
  const names = await getOrganisationNames(
    top.map((row) => row.orgId).filter((orgId) => optedInOrgIds.has(orgId)),
  );
  return top.map((row) => toEntry(row, ranked, optedInOrgIds, names, null));
}

export function publicLeaderboardRows(
  leaderboard: Leaderboard,
): LeaderboardEntry[] {
  const anonymise = (entry: LeaderboardEntry): LeaderboardEntry =>
    entry.isAnonymous ? { ...entry, name: null } : entry;
  const entries = leaderboard.entries.map(anonymise);
  if (entries.some((entry) => entry.isOwnOrg)) return entries;
  return [...entries, anonymise(leaderboard.ownEntry)];
}

export async function loadLeaderboard(
  orgId: string,
  requestedQuery: LeaderboardQuery,
): Promise<Leaderboard> {
  const query = resolveLeaderboardQuery(requestedQuery);
  const ranked = await getRankedScanCounts(query);
  const top = ranked.slice(0, LEADERBOARD_SIZE);
  const optedInOrgIds = await getOptedInOrgIds();
  const [topNames, ownName] = await Promise.all([
    getOrganisationNames(
      top.map((row) => row.orgId).filter((topOrgId) => optedInOrgIds.has(topOrgId)),
    ),
    getOrganisationNames([orgId]),
  ]);
  const names = new Map([...topNames, ...ownName]);
  const own = ranked.find((row) => row.orgId === orgId) ?? {
    orgId,
    scanCount: 0,
    selfHostedScanCount: 0,
  };

  return {
    entries: top.map((row) => toEntry(row, ranked, optedInOrgIds, names, orgId)),
    ownEntry: toEntry(own, ranked, optedInOrgIds, names, orgId),
    optedIn: optedInOrgIds.has(orgId),
    includesSelfHosted: query.includeSelfHosted,
    metric: query.metric,
    period: query.period,
  };
}
