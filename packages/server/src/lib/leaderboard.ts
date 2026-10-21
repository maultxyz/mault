import {
  LEADERBOARD_OWN_ORG_AFTER,
  LEADERBOARD_SIZE,
  type Leaderboard,
  type LeaderboardEntry,
} from "@magic-vault/shared";
import { count, eq, sql } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { orgSettings, scanStats } from "../db/schema";
import { LEADERBOARD_CACHE_TTL_MS } from "./constants/leaderboard";
import type { OrgScanCount } from "./interfaces/leaderboard";

let cached: { value: OrgScanCount[]; expiresAt: number } | null = null;
let inFlight: Promise<OrgScanCount[]> | null = null;

async function loadOptedInScanCounts(): Promise<OrgScanCount[]> {
  const rows = await db
    .select({
      orgId: sql<string>`${scanStats.orgId}`,
      scanCount: sql<number>`count(*)::int`,
    })
    .from(scanStats)
    .innerJoin(
      orgSettings,
      sql`${orgSettings.orgId} = ${scanStats.orgId} AND ${orgSettings.leaderboardOptIn}`,
    )
    .groupBy(scanStats.orgId)
    .orderBy(sql`count(*) DESC`, scanStats.orgId);
  return rows;
}

function getOptedInScanCounts(): Promise<OrgScanCount[]> {
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }
  if (inFlight) return inFlight;
  inFlight = loadOptedInScanCounts()
    .then((value) => {
      cached = { value, expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function invalidateLeaderboardCache(): void {
  cached = null;
}

async function countOrgScans(orgId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(scanStats)
    .where(eq(scanStats.orgId, orgId));
  return row?.count ?? 0;
}

function rankOf(scanCount: number, ranked: OrgScanCount[]): number {
  return 1 + ranked.filter((row) => row.scanCount > scanCount).length;
}

export async function loadTopLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const ranked = await getOptedInScanCounts();
  const top = ranked.slice(0, LEADERBOARD_SIZE);
  const names = await authProvider.getOrganisationNames(
    top.map((row) => row.orgId),
  );
  return top.map((row) => ({
    rank: rankOf(row.scanCount, ranked),
    name: names.get(row.orgId) ?? null,
    scanCount: row.scanCount,
    isOwnOrg: false,
  }));
}

export function publicLeaderboardRows(
  leaderboard: Leaderboard,
): LeaderboardEntry[] {
  if (!leaderboard.optedIn) return leaderboard.entries;
  if (leaderboard.entries.some((entry) => entry.isOwnOrg)) {
    return leaderboard.entries;
  }
  return [
    ...leaderboard.entries.slice(0, LEADERBOARD_OWN_ORG_AFTER),
    leaderboard.ownEntry,
    ...leaderboard.entries.slice(LEADERBOARD_OWN_ORG_AFTER),
  ];
}

export async function loadLeaderboard(orgId: string): Promise<Leaderboard> {
  const [ranked, settings] = await Promise.all([
    getOptedInScanCounts(),
    db
      .select({ optedIn: orgSettings.leaderboardOptIn })
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1),
  ]);
  const optedIn = settings[0]?.optedIn ?? false;
  const others = ranked.filter((row) => row.orgId !== orgId);
  const ownScanCount =
    ranked.find((row) => row.orgId === orgId)?.scanCount ??
    (await countOrgScans(orgId));
  const top = (optedIn ? ranked : others).slice(0, LEADERBOARD_SIZE);
  const names = await authProvider.getOrganisationNames([
    ...new Set([...top.map((row) => row.orgId), orgId]),
  ]);

  const entries: LeaderboardEntry[] = top.map((row) => ({
    rank: rankOf(row.scanCount, ranked),
    name: names.get(row.orgId) ?? null,
    scanCount: row.scanCount,
    isOwnOrg: row.orgId === orgId,
  }));

  return {
    entries,
    ownEntry: {
      rank: rankOf(ownScanCount, others),
      name: names.get(orgId) ?? null,
      scanCount: ownScanCount,
      isOwnOrg: true,
    },
    optedIn,
  };
}
