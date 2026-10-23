import {
  LEADERBOARD_OWN_ORG_AFTER,
  LEADERBOARD_SIZE,
  type Leaderboard,
  type LeaderboardEntry,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { orgSettings, scanStats } from "../db/schema";
import { LEADERBOARD_CACHE_TTL_MS } from "./constants/leaderboard";
import type { OrgScanCount } from "./interfaces/leaderboard";

let cached: { value: OrgScanCount[]; expiresAt: number } | null = null;
let inFlight: Promise<OrgScanCount[]> | null = null;

async function loadRankedScanCounts(): Promise<OrgScanCount[]> {
  return db
    .select({
      orgId: sql<string>`${scanStats.orgId}`,
      scanCount: sql<number>`count(*)::int`,
      optedIn: sql<boolean>`coalesce(bool_or(${orgSettings.leaderboardOptIn}), false)`,
    })
    .from(scanStats)
    .leftJoin(orgSettings, eq(orgSettings.orgId, scanStats.orgId))
    .groupBy(scanStats.orgId)
    .orderBy(sql`count(*) DESC`, scanStats.orgId);
}

function getRankedScanCounts(): Promise<OrgScanCount[]> {
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }
  if (inFlight) return inFlight;
  inFlight = loadRankedScanCounts()
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
  };
}

function namedOrgIds(rows: OrgScanCount[]): string[] {
  return rows.filter((row) => row.optedIn).map((row) => row.orgId);
}

export async function loadTopLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const ranked = await getRankedScanCounts();
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

export async function loadLeaderboard(orgId: string): Promise<Leaderboard> {
  const [ranked, settings] = await Promise.all([
    getRankedScanCounts(),
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
    optedIn,
  };

  return {
    entries: top.map((row) => toEntry(row, ranked, names, orgId)),
    ownEntry: toEntry({ ...own, optedIn }, ranked, names, orgId),
    optedIn,
  };
}
