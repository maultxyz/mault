import { Hono } from "hono";
import { CARD_API_USER_AGENT } from "../../lib/constants/card-search";
import { ALLOWED_IMAGE_HOSTS } from "../../lib/constants/urls";
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

  const upstream = await fetch(parsed.toString(), {
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
});
