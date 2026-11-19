import {
  LEADERBOARD_OWN_ORG_AFTER,
  LEADERBOARD_SIZE,
  type Leaderboard,
  type LeaderboardEntry,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { orgSettings, scanStats, selfHostedDailyScanStats } from "../db/schema";
import { LEADERBOARD_CACHE_TTL_MS } from "./constants/leaderboard";
import type { OrgScanCount } from "./interfaces/leaderboard";

const cachedRankings = new Map<boolean, { value: OrgScanCount[]; expiresAt: number }>();
const inFlightRankings = new Map<boolean, Promise<OrgScanCount[]>>();

async function loadHostedScanCounts(): Promise<OrgScanCount[]> {
  const rows = await db
    .select({
      orgId: sql<string>`${scanStats.orgId}`,
      scanCount: sql<number>`count(*)::int`,
      optedIn: sql<boolean>`coalesce(bool_or(${orgSettings.leaderboardOptIn}), false)`,
    })
    .from(scanStats)
    .leftJoin(orgSettings, eq(orgSettings.orgId, scanStats.orgId))
    .groupBy(scanStats.orgId)
    .orderBy(sql`count(*) DESC`, scanStats.orgId);
  return rows.map((row) => ({ ...row, selfHostedScanCount: 0 }));
}

async function loadScanCountsWithSelfHosted(): Promise<OrgScanCount[]> {
  const result = await db.execute(sql`
    WITH hosted AS (
      SELECT ${scanStats.orgId} AS org_id, count(*) AS scan_count
      FROM ${scanStats}
      GROUP BY ${scanStats.orgId}
    ),
    self_hosted AS (
      SELECT ${selfHostedDailyScanStats.orgId} AS org_id, sum(${selfHostedDailyScanStats.scanCount}) AS scan_count
      FROM ${selfHostedDailyScanStats}
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
      sum(c.self_hosted_scan_count)::bigint AS self_hosted_scan_count,
      coalesce((
        SELECT bool_or(${orgSettings.leaderboardOptIn}) FROM ${orgSettings}
        WHERE ${orgSettings.orgId} = c.org_id
      ), false) AS opted_in
    FROM combined c
    GROUP BY c.org_id
    ORDER BY scan_count DESC, c.org_id
  `);
  return (
    result.rows as {
      org_id: string;
      scan_count: string | number;
      self_hosted_scan_count: string | number;
      opted_in: boolean;
    }[]
  ).map((row) => ({
    orgId: row.org_id,
    scanCount: Number(row.scan_count),
    selfHostedScanCount: Number(row.self_hosted_scan_count),
    optedIn: row.opted_in,
  }));
}

function getRankedScanCounts(includeSelfHosted: boolean): Promise<OrgScanCount[]> {
  const cached = cachedRankings.get(includeSelfHosted);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }
  const inFlight = inFlightRankings.get(includeSelfHosted);
  if (inFlight) return inFlight;
  const load = (
    includeSelfHosted ? loadScanCountsWithSelfHosted() : loadHostedScanCounts()
  )
    .then((value) => {
      cachedRankings.set(includeSelfHosted, {
        value,
        expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
      });
      return value;
    })
    .finally(() => {
      inFlightRankings.delete(includeSelfHosted);
    });
  inFlightRankings.set(includeSelfHosted, load);
  return load;
}

export function invalidateLeaderboardCache(): void {
  cachedRankings.clear();
}

function rankOf(scanCount: number, ranked: OrgScanCount[]): number {
  return 1 + ranked.filter((row) => row.scanCount > scanCount).length;
}

function toEntry(
  row: OrgScanCount,
  ranked: OrgScanCount[],
  names: Map<string, string>,
  viewerOrgId: string | null,
): LeaderboardEntry {
  const isOwnOrg = row.orgId === viewerOrgId;
  return {
    rank: rankOf(row.scanCount, ranked),
    name: row.optedIn || isOwnOrg ? (names.get(row.orgId) ?? null) : null,
    scanCount: row.scanCount,
    isOwnOrg,
    isAnonymous: !row.optedIn,
    selfHostedScanCount: row.selfHostedScanCount,
  };
}

function namedOrgIds(rows: OrgScanCount[]): string[] {
  return rows.filter((row) => row.optedIn).map((row) => row.orgId);
}

export async function loadTopLeaderboardEntries(
  includeSelfHosted: boolean,
): Promise<LeaderboardEntry[]> {
  const ranked = await getRankedScanCounts(includeSelfHosted);
  const top = ranked.slice(0, LEADERBOARD_SIZE);
  const names = await authProvider.getOrganisationNames(namedOrgIds(top));
  return top.map((row) => toEntry(row, ranked, names, null));
}

export function publicLeaderboardRows(
  leaderboard: Leaderboard,
): LeaderboardEntry[] {
  const anonymise = (entry: LeaderboardEntry): LeaderboardEntry =>
    entry.isAnonymous ? { ...entry, name: null } : entry;
  const entries = leaderboard.entries.map(anonymise);
  if (entries.some((entry) => entry.isOwnOrg)) return entries;
  return [
    ...entries.slice(0, LEADERBOARD_OWN_ORG_AFTER),
    anonymise(leaderboard.ownEntry),
    ...entries.slice(LEADERBOARD_OWN_ORG_AFTER),
  ];
}

export async function loadLeaderboard(
  orgId: string,
  includeSelfHosted: boolean,
): Promise<Leaderboard> {
  const [ranked, settings] = await Promise.all([
    getRankedScanCounts(includeSelfHosted),
    db
      .select({ optedIn: orgSettings.leaderboardOptIn })
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1),
  ]);
  const optedIn = settings[0]?.optedIn ?? false;
  const top = ranked.slice(0, LEADERBOARD_SIZE);
  const names = await authProvider.getOrganisationNames([
    ...new Set([...namedOrgIds(top), orgId]),
  ]);
  const own = ranked.find((row) => row.orgId === orgId) ?? {
    orgId,
    scanCount: 0,
    selfHostedScanCount: 0,
    optedIn,
  };

  return {
    entries: top.map((row) => toEntry(row, ranked, names, orgId)),
    ownEntry: toEntry({ ...own, optedIn }, ranked, names, orgId),
    optedIn,
    includesSelfHosted: includeSelfHosted,
  };
}
