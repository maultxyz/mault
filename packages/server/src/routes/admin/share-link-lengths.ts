import {
  DEFAULT_SHARE_LINK_LENGTHS,
  type AdminShareLinkLengthsResponse,
  type ShareLinkLengths,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  parseShareLinkLengths,
  refreshShareLinkLengths,
  saveShareLinkLengths,
} from "../../lib/share-link-lengths";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function toResponse(lengths: ShareLinkLengths): AdminShareLinkLengthsResponse {
  return { lengths, defaults: DEFAULT_SHARE_LINK_LENGTHS };
}

export const shareLinkLengthsRoute = new Hono<AppEnv>()
  .get("/share-link-lengths", requireAuth, requireRole("admin"), async (c) => {
    return c.json({
      success: true,
      data: toResponse(await refreshShareLinkLengths()),
    });
  })
  .put("/share-link-lengths", requireAuth, requireRole("admin"), async (c) => {
    const lengths = parseShareLinkLengths(await c.req.json().catch(() => null));
    if (!lengths) {
      return c.json({ success: false, message: "Invalid link lengths." }, 400);
    }
    return c.json({
      success: true,
      data: toResponse(await saveShareLinkLengths(lengths)),
    });
  });
