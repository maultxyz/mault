import {
  PLATFORM_STAFF_ROLES,
  PLATFORM_DISCORD_CHANNEL_KEYS,
  type AdminPlatformDiscordChannelsResponse,
  type PlatformDiscordChannelsSettings,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  checkDiscordChannel,
  fetchDiscordGuild,
  fetchDiscordGuilds,
} from "../../lib/discord";
import {
  loadPlatformDiscordChannels,
  savePlatformDiscordChannels,
} from "../../lib/platform-discord-channels";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

async function toResponse(
  settings: PlatformDiscordChannelsSettings,
): Promise<AdminPlatformDiscordChannelsResponse> {
  const { reachable, guilds } = await fetchDiscordGuilds();
  return { settings, botReachable: reachable, guilds };
}

function parseSettings(body: unknown): PlatformDiscordChannelsSettings | null {
  if (!body || typeof body !== "object") return null;
  const toId = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const entries = PLATFORM_DISCORD_CHANNEL_KEYS.map((key) => {
    const entry = (body as Record<string, unknown>)[key];
    if (!entry || typeof entry !== "object") return null;
    const { guildId, channelId } = entry as Record<string, unknown>;
    const guild = toId(guildId);
    return [key, { guildId: guild, channelId: guild ? toId(channelId) : null }];
  });
  if (entries.some((entry) => !entry)) return null;
  return Object.fromEntries(
    entries as [string, unknown][],
  ) as PlatformDiscordChannelsSettings;
}

export const discordChannelsRoute = new Hono<AppEnv>()
  .get("/discord-channels", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    try {
      return c.json({
        success: true,
        data: await toResponse(await loadPlatformDiscordChannels()),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .get(
    "/discord-channels/guilds/:guildId",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const { reachable, guild } = await fetchDiscordGuild(
        c.req.param("guildId"),
      );
      if (!reachable) {
        return c.json(
          { success: false, message: "The Discord bot isn't reachable." },
          502,
        );
      }
      if (!guild) {
        return c.json(
          { success: false, message: "The bot isn't in that server." },
          404,
        );
      }
      return c.json({ success: true, data: guild });
    },
  )
  .put("/discord-channels", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const settings = parseSettings(await c.req.json().catch(() => null));
    if (!settings) {
      return c.json(
        { success: false, message: "Invalid channel settings." },
        400,
      );
    }
    for (const key of PLATFORM_DISCORD_CHANNEL_KEYS) {
      const { guildId, channelId } = settings[key];
      if (!guildId || !channelId) continue;
      const failure = await checkDiscordChannel(guildId, channelId);
      if (failure) {
        return c.json(
          { success: false, message: failure.message },
          failure.status,
        );
      }
    }
    try {
      return c.json({
        success: true,
        data: await toResponse(await savePlatformDiscordChannels(settings)),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
