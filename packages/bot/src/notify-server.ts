import { serve } from "@hono/node-server";
import {
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  ThreadAutoArchiveDuration,
  type APIEmbed,
  type Client,
} from "discord.js";
import { Hono } from "hono";
import sharp from "sharp";

const PORT = parseInt(process.env.BOT_PORT ?? "3002");
const BOT_API_SECRET = process.env.BOT_API_SECRET ?? "";
const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3001";
const COMPOSITE_HEIGHT = 480;
const COMPOSITE_GAP = 16;
const SCAN_ATTACHMENT_NAME = "scan.jpg";

interface NotifyBody {
  channelId?: string;
  threadId?: string | null;
  threadName?: string | null;
  useThread?: boolean;
  embed?: APIEmbed;
  attachmentDataUrl?: string;
  secondaryImageUrl?: string;
}

function decodeDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

async function compositeSideBySide(
  primary: Buffer,
  secondaryUrl: string,
): Promise<Buffer> {
  const proxyUrl = `${SERVER_URL}/cards/image-proxy?url=${encodeURIComponent(secondaryUrl)}`;
  const secondaryRes = await fetch(proxyUrl);
  if (!secondaryRes.ok) {
    throw new Error(`Failed to fetch reference image: ${secondaryRes.status}`);
  }
  const secondaryRaw = Buffer.from(await secondaryRes.arrayBuffer());

  const [left, right] = await Promise.all([
    sharp(primary).resize({ height: COMPOSITE_HEIGHT }).toBuffer(),
    sharp(secondaryRaw).resize({ height: COMPOSITE_HEIGHT }).toBuffer(),
  ]);
  const [leftMeta, rightMeta] = await Promise.all([
    sharp(left).metadata(),
    sharp(right).metadata(),
  ]);
  const leftWidth = leftMeta.width ?? COMPOSITE_HEIGHT;
  const rightWidth = rightMeta.width ?? COMPOSITE_HEIGHT;

  return sharp({
    create: {
      width: leftWidth + COMPOSITE_GAP + rightWidth,
      height: COMPOSITE_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: leftWidth + COMPOSITE_GAP, top: 0 },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();
}

export function startNotifyServer(client: Client) {
  const app = new Hono();

  app.post("/notify", async (c) => {
    const secret = c.req.header("X-Bot-Secret");
    if (!secret || !BOT_API_SECRET || secret !== BOT_API_SECRET) {
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
      const channel = await client.channels.fetch(body.channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        return c.json(
          {
            success: false,
            message: "Channel not found or not a text channel.",
          },
          404,
        );
      }

      const files = [];
      if (body.attachmentDataUrl) {
        let buffer = decodeDataUrl(body.attachmentDataUrl);
        if (buffer && body.secondaryImageUrl) {
          try {
            buffer = await compositeSideBySide(buffer, body.secondaryImageUrl);
          } catch (err) {
            console.error(
              "[bot] Failed to composite reference image, using captured photo only:",
              err,
            );
          }
        }
        if (buffer) {
          files.push(
            new AttachmentBuilder(buffer, { name: SCAN_ATTACHMENT_NAME }),
          );
        }
      }

      if (!useThread) {
        await channel.send({ embeds: [EmbedBuilder.from(body.embed)], files });
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

      await thread.send({ embeds: [EmbedBuilder.from(body.embed)], files });
      return c.json({ success: true, data: { threadId: thread.id } });
    } catch (err) {
      console.error("[bot] Failed to post notification:", err);
      return c.json({ success: false, message: "Failed to send." }, 500);
    }
  });

  serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, () => {
    console.log(`[bot] Notify server listening on port ${PORT}`);
  });
}
