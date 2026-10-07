import type {
  AdminPlatformStatsResponse,
  PlatformStatsSettings,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { fetchDiscordGuild, fetchDiscordGuilds } from "../../lib/discord";
import type { StoredPlatformStatsSettings } from "../../lib/interfaces/platform-stats";
import {
  loadPlatformStatsSettings,
  parsePlatformStatKeys,
  postPlatformStats,
  savePlatformStatsSettings,
} from "../../lib/platform-stats";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

async function toResponse(
  stored: StoredPlatformStatsSettings,
): Promise<AdminPlatformStatsResponse> {
  const { reachable, guilds } = await fetchDiscordGuilds();
  return {
    settings: {
      guildId: stored.guildId,
      channelId: stored.channelId,
      stats: stored.stats,
    },
    lastPostedAt: stored.lastPostedAt?.toISOString() ?? null,
    botReachable: reachable,
    guilds,
  };
}

function parseSettings(body: unknown): PlatformStatsSettings | null {
  if (!body || typeof body !== "object") return null;
  const { guildId, channelId, stats } = body as Record<string, unknown>;
  const toId = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  if (!Array.isArray(stats)) return null;
  return {
    guildId: toId(guildId),
    channelId: toId(guildId) ? toId(channelId) : null,
    stats: parsePlatformStatKeys(stats),
  };
}

export const platformStatsRoute = new Hono<AppEnv>()
  .get("/platform-stats", requireAuth, requireRole("admin"), async (c) => {
    try {
      return c.json({
        success: true,
        data: await toResponse(await loadPlatformStatsSettings()),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .get(
    "/platform-stats/guilds/:guildId",
    requireAuth,
    requireRole("admin"),
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
  .put("/platform-stats", requireAuth, requireRole("admin"), async (c) => {
    const settings = parseSettings(await c.req.json().catch(() => null));
    if (!settings) {
      return c.json(
        { success: false, message: "Invalid stats settings." },
        400,
      );
    }
    if (settings.guildId && settings.channelId) {
      const { reachable, guild } = await fetchDiscordGuild(settings.guildId);
      if (!reachable) {
        return c.json(
          { success: false, message: "The Discord bot isn't reachable." },
          502,
        );
      }
      const channel = guild?.channels.find((ch) => ch.id === settings.channelId);
      if (!channel) {
        return c.json(
          { success: false, message: "That channel isn't in the server." },
          400,
        );
      }
      if (channel.missingPermissions.length) {
        return c.json(
          {
            success: false,
            message: `The bot is missing permissions in that channel: ${channel.missingPermissions.join(", ")}.`,
          },
          400,
        );
      }
    }
    try {
      return c.json({
        success: true,
        data: await toResponse(await savePlatformStatsSettings(settings)),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .post("/platform-stats/post", requireAuth, requireRole("admin"), async (c) => {
    try {
      const outcome = await postPlatformStats();
      if (outcome === "not_configured") {
        return c.json(
          {
            success: false,
            message: "Pick a server, a channel and at least one stat first.",
          },
          400,
        );
      }
      if (outcome === "failed") {
        return c.json(
          { success: false, message: "The bot couldn't post the stats." },
          502,
        );
      }
      return c.json({
        success: true,
        data: await toResponse(await loadPlatformStatsSettings()),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
