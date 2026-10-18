import { Hono } from "hono";
import {
  CARD_API_USER_AGENT,
  NETDECK_IMAGE_GAMES,
  NETDECK_SLUG_PATTERN,
} from "../../lib/constants/card-search";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { netdeckSignedImageUrl } from "../../lib/netdeck";
import type { AppEnv } from "../../middleware/auth";

export const netdeckImageRoute = new Hono<AppEnv>().get(
  "/netdeck-image/:game/:slug/:printingId",
  async (c) => {
    const { game, slug, printingId } = c.req.param();
    if (
      !NETDECK_IMAGE_GAMES.has(game) ||
      !NETDECK_SLUG_PATTERN.test(slug) ||
      !UUID_PATTERN.test(printingId)
    ) {
      return c.json({ success: false, message: "Invalid card image." }, 400);
    }

    const signedUrl = await netdeckSignedImageUrl(game, slug, printingId);
    if (!signedUrl) {
      return c.json({ success: false, message: "Card image not found." }, 404);
    }

    const upstream = await fetch(signedUrl, {
      headers: { "User-Agent": CARD_API_USER_AGENT, Accept: "image/*" },
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return c.json({ success: false, message: "Failed to fetch image." }, 502);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return c.body(buffer, 200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
  },
);
