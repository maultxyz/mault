import { eq } from "drizzle-orm";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";

export async function resolveOrgByGuild(guildId: string): Promise<string | null> {
  const rows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(eq(orgSettings.discordGuildId, guildId))
    .limit(1);
  return rows[0]?.orgId ?? null;
}

export const getOrgName = (orgId: string) => authProvider.getOrganisationName(orgId);
