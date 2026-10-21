import type { PlatformDiscordLinkedRole } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { platformDiscordRoles } from "../db/schema";
import { LINKED_ACCOUNT_ROLE_KEY } from "./constants/discord";

export async function loadLinkedAccountRole(): Promise<PlatformDiscordLinkedRole> {
  const [row] = await db
    .select({
      guildId: platformDiscordRoles.guildId,
      roleId: platformDiscordRoles.roleId,
    })
    .from(platformDiscordRoles)
    .where(eq(platformDiscordRoles.key, LINKED_ACCOUNT_ROLE_KEY))
    .limit(1);
  return row ?? { guildId: null, roleId: null };
}

export async function saveLinkedAccountRole(
  role: PlatformDiscordLinkedRole,
): Promise<PlatformDiscordLinkedRole> {
  const values = { ...role, updatedAt: new Date() };
  await db
    .insert(platformDiscordRoles)
    .values({ key: LINKED_ACCOUNT_ROLE_KEY, ...values })
    .onConflictDoUpdate({ target: platformDiscordRoles.key, set: values });
  return loadLinkedAccountRole();
}
