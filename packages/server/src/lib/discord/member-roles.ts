import type { PlatformDiscordLinkedRole } from "@magic-vault/shared";
import { DISCORD_GUILD_FETCH_TIMEOUT_MS } from "../constants/discord";
import type { DiscordMemberRoleAction } from "../interfaces/discord";
import { loadLinkedAccountRole } from "../platform-discord-roles";
import { listLinkedDiscordUserIds } from "./user-links";

async function sendMemberRole(
  role: PlatformDiscordLinkedRole,
  discordUserId: string,
  action: DiscordMemberRoleAction,
): Promise<void> {
  const botUrl = process.env.BOT_URL;
  const botSecret = process.env.BOT_API_SECRET;
  if (!botUrl || !botSecret || !role.guildId || !role.roleId) return;

  try {
    const res = await fetch(`${botUrl}/members/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": botSecret,
      },
      body: JSON.stringify({
        guildId: role.guildId,
        userId: discordUserId,
        roleId: role.roleId,
        action,
      }),
      signal: AbortSignal.timeout(DISCORD_GUILD_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      console.error(
        `[discord] Failed to ${action} the linked role for ${discordUserId}: ${body?.message ?? res.status}`,
      );
    }
  } catch (err) {
    console.error(
      `[discord] Failed to ${action} the linked role for ${discordUserId}:`,
      err,
    );
  }
}

export async function updateLinkedAccountRole(
  discordUserId: string,
  action: DiscordMemberRoleAction,
): Promise<void> {
  await sendMemberRole(await loadLinkedAccountRole(), discordUserId, action);
}

export async function syncLinkedAccountRoleChange(
  previous: PlatformDiscordLinkedRole,
  next: PlatformDiscordLinkedRole,
): Promise<void> {
  if (previous.guildId === next.guildId && previous.roleId === next.roleId) {
    return;
  }
  const discordUserIds = await listLinkedDiscordUserIds();
  for (const discordUserId of discordUserIds) {
    await sendMemberRole(previous, discordUserId, "remove");
    await sendMemberRole(next, discordUserId, "add");
  }
}
