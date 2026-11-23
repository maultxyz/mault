import type { DiscordEmbed } from "../interfaces/discord";

export function isDiscordBotConfigured(): boolean {
  return !!process.env.BOT_URL && !!process.env.BOT_API_SECRET;
}

export async function sendDiscordDirectMessage(
  discordUserId: string,
  embed: DiscordEmbed,
): Promise<boolean> {
  const botUrl = process.env.BOT_URL;
  const botSecret = process.env.BOT_API_SECRET;
  if (!botUrl || !botSecret) return false;
  try {
    const res = await fetch(`${botUrl}/direct-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": botSecret },
      body: JSON.stringify({ discordUserId, embed }),
    });
    if (!res.ok) {
      console.warn(`[discord] Bot direct message failed: ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[discord] Failed to send a direct message:", err);
    return false;
  }
}
