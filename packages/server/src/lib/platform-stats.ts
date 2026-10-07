import {
  DEFAULT_PLATFORM_STAT_KEYS,
  PLATFORM_STAT_KEYS,
  type PlatformStatKey,
  type PlatformStatsSettings,
  type PlatformStatValues,
} from "@magic-vault/shared";
import { count, eq, gt } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import {
  collections,
  devices,
  platformStatsSettings,
  scanStats,
} from "../db/schema";
import {
  PLATFORM_STAT_LABELS,
  PLATFORM_STATS_EMBED_COLOR,
  PLATFORM_STATS_EMBED_TITLE,
  PLATFORM_STATS_RECENT_WINDOW_MS,
  PLATFORM_STATS_SETTINGS_ID,
} from "./constants/platform-stats";
import { sendDiscordChannelMessage } from "./discord";
import type { DiscordEmbed } from "./interfaces/discord";
import type {
  PlatformStatsPostOutcome,
  StoredPlatformStatsSettings,
} from "./interfaces/platform-stats";

const countRows = async (query: Promise<{ count: number }[]>) =>
  (await query)[0]?.count ?? 0;

const STAT_LOADERS: Record<
  Exclude<PlatformStatKey, "users" | "organizations">,
  () => Promise<number>
> = {
  scannedCards: () => countRows(db.select({ count: count() }).from(scanStats)),
  scansLast24Hours: () =>
    countRows(
      db
        .select({ count: count() })
        .from(scanStats)
        .where(
          gt(
            scanStats.createdAt,
            new Date(Date.now() - PLATFORM_STATS_RECENT_WINDOW_MS),
          ),
        ),
    ),
  devices: () =>
    countRows(
      db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.isDeleted, false)),
    ),
  collections: () =>
    countRows(
      db
        .select({ count: count() })
        .from(collections)
        .where(eq(collections.isDeleted, false)),
    ),
};

export function parsePlatformStatKeys(value: unknown): PlatformStatKey[] {
  if (!Array.isArray(value)) return [];
  return PLATFORM_STAT_KEYS.filter((key) => value.includes(key));
}

export async function computePlatformStats(
  keys: PlatformStatKey[],
): Promise<Partial<PlatformStatValues>> {
  const needsAccounts = keys.includes("users") || keys.includes("organizations");
  const [accounts, ...values] = await Promise.all([
    needsAccounts ? authProvider.countUsersAndOrganisations() : null,
    ...keys.map((key) =>
      key === "users" || key === "organizations"
        ? Promise.resolve(0)
        : STAT_LOADERS[key](),
    ),
  ]);
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      key === "users"
        ? (accounts?.users ?? 0)
        : key === "organizations"
          ? (accounts?.organisations ?? 0)
          : values[i],
    ]),
  );
}

export function buildPlatformStatsEmbed(
  keys: PlatformStatKey[],
  values: Partial<PlatformStatValues>,
): DiscordEmbed {
  return {
    title: PLATFORM_STATS_EMBED_TITLE,
    color: PLATFORM_STATS_EMBED_COLOR,
    timestamp: new Date().toISOString(),
    fields: keys.map((key) => ({
      name: PLATFORM_STAT_LABELS[key],
      value: (values[key] ?? 0).toLocaleString("en-US"),
      inline: true,
    })),
  };
}

export async function loadPlatformStatsSettings(): Promise<StoredPlatformStatsSettings> {
  const [row] = await db
    .select()
    .from(platformStatsSettings)
    .where(eq(platformStatsSettings.id, PLATFORM_STATS_SETTINGS_ID))
    .limit(1);
  return {
    guildId: row?.guildId ?? null,
    channelId: row?.channelId ?? null,
    stats: row
      ? parsePlatformStatKeys(row.stats)
      : [...DEFAULT_PLATFORM_STAT_KEYS],
    lastPostedAt: row?.lastPostedAt ?? null,
  };
}

export async function savePlatformStatsSettings(
  settings: PlatformStatsSettings,
): Promise<StoredPlatformStatsSettings> {
  const now = new Date();
  const values = {
    guildId: settings.guildId,
    channelId: settings.channelId,
    stats: settings.stats,
    updatedAt: now,
  };
  const [row] = await db
    .insert(platformStatsSettings)
    .values({ id: PLATFORM_STATS_SETTINGS_ID, ...values })
    .onConflictDoUpdate({ target: platformStatsSettings.id, set: values })
    .returning();
  return {
    guildId: row.guildId,
    channelId: row.channelId,
    stats: parsePlatformStatKeys(row.stats),
    lastPostedAt: row.lastPostedAt,
  };
}

export async function postPlatformStats(): Promise<PlatformStatsPostOutcome> {
  const settings = await loadPlatformStatsSettings();
  if (!settings.guildId || !settings.channelId || !settings.stats.length) {
    return "not_configured";
  }
  const values = await computePlatformStats(settings.stats);
  const sent = await sendDiscordChannelMessage({
    guildId: settings.guildId,
    channelId: settings.channelId,
    embed: buildPlatformStatsEmbed(settings.stats, values),
  });
  if (!sent) return "failed";
  await db
    .update(platformStatsSettings)
    .set({ lastPostedAt: new Date() })
    .where(eq(platformStatsSettings.id, PLATFORM_STATS_SETTINGS_ID));
  return "sent";
}
