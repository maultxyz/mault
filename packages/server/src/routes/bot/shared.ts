import { and, eq, sql } from "drizzle-orm";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { collections, orgSettings } from "../../db/schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveOrgByGuild(
  guildId: string,
): Promise<string | null> {
  const rows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(eq(orgSettings.discordGuildId, guildId))
    .limit(1);
  return rows[0]?.orgId ?? null;
}

export async function resolveOrgCollection(orgId: string, ref: string) {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const [row] = await db
    .select({
      id: collections.id,
      guid: collections.guid,
      name: collections.name,
      scanChannelId: collections.discordScanChannelId,
      errorChannelId: collections.discordErrorChannelId,
    })
    .from(collections)
    .where(
      and(
        eq(collections.orgId, orgId),
        UUID_PATTERN.test(trimmed)
          ? eq(collections.guid, trimmed)
          : sql`lower(${collections.name}) = lower(${trimmed})`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export const getOrgName = (orgId: string) =>
  authProvider.getOrganisationName(orgId);
