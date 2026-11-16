import { Hono } from "hono";
import { CARD_IMAGE_PROXY_CACHE_CONTROL } from "../../lib/constants/card-search";
import { ALLOWED_IMAGE_HOSTS } from "../../lib/constants/urls";
import { fetchProxiedImage } from "../../lib/image-proxy-fetch";
import type { AppEnv } from "../../middleware/auth";

export const imageProxyRoute = new Hono<AppEnv>().get("/image-proxy", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ success: false, message: "Missing url." }, 400);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return c.json({ success: false, message: "Invalid url." }, 400);
  }
  if (
    parsed.protocol !== "https:" ||
    !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)
  ) {
    return c.json({ success: false, message: "Host not allowed." }, 400);
  }

  const image = await fetchProxiedImage(
    parsed.toString(),
    (candidate) =>
      candidate.protocol === "https:" &&
      ALLOWED_IMAGE_HOSTS.has(candidate.hostname),
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
});
