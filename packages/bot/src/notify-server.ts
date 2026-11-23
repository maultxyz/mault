import { timingSafeEqual } from "node:crypto";
import { serve } from "@hono/node-server";
import {
  AttachmentBuilder,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  RESTJSONErrorCodes,
  ThreadAutoArchiveDuration,
  type Client,
  type GuildMember,
} from "discord.js";
import { Hono } from "hono";
import { listNotifyChannels, listPingableRoles } from "./lib/notify-channel";
import {
  BOT_API_SECRET,
  NOTIFY_SERVER_PORT,
  SCAN_ATTACHMENT_NAME,
} from "./lib/constants";
import type {
  DirectMessageBody,
  MemberRoleBody,
  NotifyBody,
} from "./lib/interfaces";

function decodeDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

function botSecretMatches(providedSecret: string | undefined): boolean {
  const expected = Buffer.from(BOT_API_SECRET ?? "");
  const provided = Buffer.from(providedSecret ?? "");
  return (
    expected.length > 0 &&
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export function startNotifyServer(client: Client) {
  const app = new Hono();

  app.get("/guilds", (c) => {
    const secret = c.req.header("X-Bot-Secret");
    if (!botSecretMatches(secret)) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    return c.json({
      success: true,
      data: [...client.guilds.cache.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((guild) => ({
          id: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL({ size: 64 }),
        })),
    });
  });

  app.get("/guilds/:guildId", (c) => {
    const secret = c.req.header("X-Bot-Secret");
    if (!botSecretMatches(secret)) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const guild = client.guilds.cache.get(c.req.param("guildId"));
    if (!guild) {
      return c.json({ success: false, message: "not_in_guild" }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL({ size: 64 }),
        channels: listNotifyChannels(guild),
        roles: listPingableRoles(guild),
      },
    });
  });

  app.post("/notify", async (c) => {
    const secret = c.req.header("X-Bot-Secret");
    if (!botSecretMatches(secret)) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const body = await c.req.json<NotifyBody>();
    const useThread = body.useThread ?? true;
    if (!body.channelId || !body.embed || (useThread && !body.threadName)) {
      return c.json(
        {
          success: false,
          message: useThread
            ? "channelId, threadName, and embed are required."
            : "channelId and embed are required.",
        },
        400,
      );
    }

    try {
      const channel = await client.channels
        .fetch(body.channelId)
        .catch(() => null);
      if (
        !channel ||
        (channel.type !== ChannelType.GuildText &&
          channel.type !== ChannelType.GuildAnnouncement) ||
        (body.guildId && channel.guildId !== body.guildId)
      ) {
        return c.json(
          {
            success: false,
            message: "Channel not found, not accessible, or not a text channel.",
          },
          404,
        );
      }

      const files = [];
      if (body.attachmentDataUrl) {
        const buffer = decodeDataUrl(body.attachmentDataUrl);
        if (buffer) {
          files.push(
            new AttachmentBuilder(buffer, { name: SCAN_ATTACHMENT_NAME }),
          );
        }
      }

      const pingRoleIds = (body.pingRoleIds ?? []).filter((id) =>
        channel.guild.roles.cache.has(id),
      );
      const message = {
        content: pingRoleIds.length
          ? pingRoleIds.map((id) => `<@&${id}>`).join(" ")
          : undefined,
        allowedMentions: { parse: [], roles: pingRoleIds },
        embeds: [EmbedBuilder.from(body.embed)],
        files,
      };

      if (!useThread) {
        await channel.send(message);
        return c.json({ success: true, data: {} });
      }

      let thread = null;
      if (body.threadId) {
        thread = await channel.threads.fetch(body.threadId).catch(() => null);
      }

      if (!thread) {
        thread = await channel.threads.create({
          name: body.threadName!,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        });
      } else if (thread.archived) {
        await thread.setArchived(false);
      }

      await thread.send(message);
      return c.json({ success: true, data: { threadId: thread.id } });
    } catch (err) {
      console.error("[bot] Failed to post notification:", err);
      return c.json({ success: false, message: "Failed to send." }, 500);
    }
  });

  app.post("/direct-messages", async (c) => {
    const secret = c.req.header("X-Bot-Secret");
    if (!botSecretMatches(secret)) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const body = await c.req.json<DirectMessageBody>();
    if (!body.discordUserId || !body.embed) {
      return c.json(
        { success: false, message: "discordUserId and embed are required." },
        400,
      );
    }

    try {
      const user = await client.users.fetch(body.discordUserId);
      await user.send({
        allowedMentions: { parse: [] },
        embeds: [EmbedBuilder.from(body.embed)],
      });
      return c.json({ success: true, data: {} });
    } catch (err) {
      if (
        err instanceof DiscordAPIError &&
        (err.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser ||
          err.code === RESTJSONErrorCodes.UnknownUser)
      ) {
        return c.json({ success: false, message: "cant_message_user" }, 403);
      }
      console.error("[bot] Failed to send a direct message:", err);
      return c.json({ success: false, message: "Failed to send." }, 500);
    }
  });

  app.post("/members/role", async (c) => {
    const secret = c.req.header("X-Bot-Secret");
    if (!botSecretMatches(secret)) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }

    const body = await c.req.json<MemberRoleBody>();
    if (
      !body.guildId ||
      !body.userId ||
      !body.roleId ||
      (body.action !== "add" && body.action !== "remove")
    ) {
      return c.json(
        {
          success: false,
          message: "guildId, userId, roleId and action are required.",
        },
        400,
      );
    }

    const guild = client.guilds.cache.get(body.guildId);
    if (!guild) {
      return c.json({ success: false, message: "not_in_guild" }, 404);
    }
    const role = guild.roles.cache.get(body.roleId);
    if (!role) {
      return c.json({ success: false, message: "role_not_found" }, 404);
    }
    if (!role.editable) {
      return c.json({ success: false, message: "cant_assign_role" }, 400);
    }

    let member: GuildMember;
    try {
      member = await guild.members.fetch(body.userId);
    } catch (err) {
      if (
        err instanceof DiscordAPIError &&
        err.code === RESTJSONErrorCodes.UnknownMember
      ) {
        return c.json({ success: true, message: "not_member" });
      }
      console.error("[bot] Failed to look up member:", err);
      return c.json({ success: false, message: "Failed to look up member." }, 500);
    }

    try {
      if (body.action === "add") {
        await member.roles.add(role, "Linked a Mault account");
      } else {
        await member.roles.remove(role, "Unlinked a Mault account");
      }
      return c.json({ success: true, message: "updated" });
    } catch (err) {
      console.error("[bot] Failed to update member role:", err);
      return c.json({ success: false, message: "Failed to update role." }, 500);
    }
  });

  serve({ fetch: app.fetch, port: NOTIFY_SERVER_PORT, hostname: "0.0.0.0" }, () => {
    console.log(`[bot] Notify server listening on port ${NOTIFY_SERVER_PORT}`);
  });
}
