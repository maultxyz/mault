import { Hono } from "hono";
import {
  listUserRulePresets,
  loadUserRulePreset,
} from "../../lib/bot-presets";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { findUserIdByDiscordUser } from "../../lib/discord/user-links";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botRulePresetsRoute = new Hono<AppEnv>()
  .get("/rule-presets", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    const guildId = c.req.query("guildId");
    if (!discordUserId) {
      return c.json(
        { success: false, message: "discordUserId is required." },
        400,
      );
    }

    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) {
      return c.json({ success: false, message: "account_not_linked" }, 404);
    }

    const guildOrgId = guildId ? await resolveOrgByGuild(guildId) : null;
    return c.json({
      success: true,
      data: await listUserRulePresets(userId, guildOrgId),
    });
  })
  .get("/rule-preset", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    const presetGuid = c.req.query("presetGuid");
    if (!discordUserId || !presetGuid || !UUID_PATTERN.test(presetGuid)) {
      return c.json(
        { success: false, message: "discordUserId and presetGuid are required." },
        400,
      );
    }

    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) {
      return c.json({ success: false, message: "account_not_linked" }, 404);
    }

    const preset = await loadUserRulePreset(userId, presetGuid);
    if (!preset) {
      return c.json({ success: false, message: "preset_not_found" }, 404);
    }
    return c.json({ success: true, data: preset });
  });
