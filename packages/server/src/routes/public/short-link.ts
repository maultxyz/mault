import { SHORT_LINK_CODE_PATTERN, type ShortLinkTarget } from "@magic-vault/shared";
import { Hono } from "hono";
import { SHORT_LINK_NOT_FOUND_MESSAGE } from "../../lib/constants/short-links";
import { resolveShortLinkPath } from "../../lib/short-links";
import type { AppEnv } from "../../middleware/auth";

export const publicShortLinkRoute = new Hono<AppEnv>().get("/short-link", async (c) => {
  c.header("Cache-Control", "no-store");
  const shortCode = c.req.query("code") ?? "";
  const path = SHORT_LINK_CODE_PATTERN.test(shortCode)
    ? await resolveShortLinkPath(shortCode)
    : null;
  if (!path) return c.json({ success: false, message: SHORT_LINK_NOT_FOUND_MESSAGE }, 404);
  return c.json({ success: true, data: { path } satisfies ShortLinkTarget });
});
