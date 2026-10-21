import type { PlatformDiscordLinkedRole } from "@magic-vault/shared";
import { Hono } from "hono";
import { fetchDiscordGuild } from "../../lib/discord";
import { syncLinkedAccountRoleChange } from "../../lib/discord/member-roles";
import {
  loadLinkedAccountRole,
  saveLinkedAccountRole,
} from "../../lib/platform-discord-roles";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function parseLinkedRole(body: unknown): PlatformDiscordLinkedRole | null {
  if (!body || typeof body !== "object") return null;
  const toId = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const { guildId, roleId } = body as Record<string, unknown>;
  const guild = toId(guildId);
  return { guildId: guild, roleId: guild ? toId(roleId) : null };
}

export const discordLinkedRoleRoute = new Hono<AppEnv>()
  .get("/discord-linked-role", requireAuth, requireRole("admin"), async (c) => {
    try {
      return c.json({ success: true, data: await loadLinkedAccountRole() });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .put("/discord-linked-role", requireAuth, requireRole("admin"), async (c) => {
    const next = parseLinkedRole(await c.req.json().catch(() => null));
    if (!next) {
      return c.json({ success: false, message: "Invalid settings." }, 400);
    }

    if (next.guildId && next.roleId) {
      const { reachable, guild } = await fetchDiscordGuild(next.guildId);
      if (!reachable) {
        return c.json(
          { success: false, message: "The Discord bot isn't reachable." },
          502,
        );
      }
      const role = guild?.roles.find((r) => r.id === next.roleId);
      if (!role) {
        return c.json(
          { success: false, message: "That role isn't in the server." },
          400,
        );
      }
      if (!role.canAssign) {
        return c.json(
          {
            success: false,
            message:
              "The bot can't assign that role. Give it Manage Roles and move its role above this one.",
          },
          400,
        );
      }
    }

    try {
      const previous = await loadLinkedAccountRole();
      const saved = await saveLinkedAccountRole(next);
      void syncLinkedAccountRoleChange(previous, saved).catch((err) =>
        console.error("[discord] Failed to sync the linked role:", err),
      );
      return c.json({ success: true, data: saved });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
