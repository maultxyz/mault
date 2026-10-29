import { Hono } from "hono";
import {
  listUserCalibrationDevices,
  loadUserDeviceCalibration,
} from "../../lib/bot-calibration";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { findUserIdByDiscordUser } from "../../lib/discord/user-links";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botCalibrationRoute = new Hono<AppEnv>()
  .get("/calibration-devices", async (c) => {
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
      data: await listUserCalibrationDevices(userId, guildOrgId),
    });
  })
  .get("/calibration", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    const deviceGuid = c.req.query("deviceGuid");
    if (!discordUserId || !deviceGuid || !UUID_PATTERN.test(deviceGuid)) {
      return c.json(
        { success: false, message: "discordUserId and deviceGuid are required." },
        400,
      );
    }

    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) {
      return c.json({ success: false, message: "account_not_linked" }, 404);
    }

    const calibration = await loadUserDeviceCalibration(userId, deviceGuid);
    if (!calibration) {
      return c.json({ success: false, message: "device_not_found" }, 404);
    }
    return c.json({ success: true, data: calibration });
  });
