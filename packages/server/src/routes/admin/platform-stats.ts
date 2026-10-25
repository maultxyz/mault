import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import type {
  AdminPlatformStatsResponse,
  PlatformStatsSettings,
} from "@magic-vault/shared";
import { Hono } from "hono";
import type { StoredPlatformStatsSettings } from "../../lib/interfaces/platform-stats";
import { loadPlatformDiscordChannel } from "../../lib/platform-discord-channels";
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
  const { guildId, channelId } = await loadPlatformDiscordChannel("stats");
  return {
    settings: { stats: stored.stats },
    lastPostedAt: stored.lastPostedAt?.toISOString() ?? null,
    channelConfigured: !!guildId && !!channelId,
  };
}

function parseSettings(body: unknown): PlatformStatsSettings | null {
  if (!body || typeof body !== "object") return null;
  const { stats } = body as Record<string, unknown>;
  if (!Array.isArray(stats)) return null;
  return { stats: parsePlatformStatKeys(stats) };
}

export const platformStatsRoute = new Hono<AppEnv>()
  .get("/platform-stats", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
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
  .put("/platform-stats", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const settings = parseSettings(await c.req.json().catch(() => null));
    if (!settings) {
      return c.json(
        { success: false, message: "Invalid stats settings." },
        400,
      );
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
  .post("/platform-stats/post", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    try {
      const outcome = await postPlatformStats();
      if (outcome === "not_configured") {
        return c.json(
          {
            success: false,
            message:
              "Pick a stats channel in Discord channels and at least one stat first.",
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
