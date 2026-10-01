import type { DiscordGuildInfo } from "@magic-vault/shared";
import { DISCORD_GUILD_FETCH_TIMEOUT_MS } from "../constants/discord";

export async function fetchDiscordGuild(
  guildId: string,
): Promise<{ reachable: boolean; guild: DiscordGuildInfo | null }> {
  const botUrl = process.env.BOT_URL;
  const botSecret = process.env.BOT_API_SECRET;
  if (!botUrl || !botSecret) return { reachable: false, guild: null };

  try {
    const res = await fetch(
      `${botUrl}/guilds/${encodeURIComponent(guildId)}`,
      {
        headers: { "X-Bot-Secret": botSecret },
        signal: AbortSignal.timeout(DISCORD_GUILD_FETCH_TIMEOUT_MS),
      },
    );
    if (res.status === 404) return { reachable: true, guild: null };
    if (!res.ok) return { reachable: false, guild: null };
    const body = (await res.json()) as { data?: DiscordGuildInfo };
    return { reachable: true, guild: body.data ?? null };
  } catch (err) {
    console.error("[discord] Failed to fetch guild from bot:", err);
    return { reachable: false, guild: null };
  }
}
