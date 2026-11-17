import { Hono } from "hono";
import {
  CARD_IMAGE_PROXY_CACHE_CONTROL,
  NETDECK_IMAGE_GAMES,
  NETDECK_SLUG_PATTERN,
} from "../../lib/constants/card-search";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { fetchProxiedImage } from "../../lib/image-proxy-fetch";
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

    const image = await fetchProxiedImage(
      signedUrl,
      (candidate) => candidate.protocol === "https:",
    );
    if (!image) {
      return c.json({ success: false, message: "Failed to fetch image." }, 502);
    }

    return c.body(image.body, 200, {
      "Content-Type": image.contentType,
      "Cache-Control": CARD_IMAGE_PROXY_CACHE_CONTROL,
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    });
  },
);
