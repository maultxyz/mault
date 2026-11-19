import { Hono } from "hono";
import { SHARE_PREVIEW_ROUTE_PATH } from "../../lib/constants/share-preview";
import { getWebUrl } from "../../lib/constants/urls";
import { loadSharePreview } from "../../lib/share-preview";
import { parseSharePreviewPath, renderSharePreviewHtml } from "../../lib/share-preview-html";
import type { AppEnv } from "../../middleware/auth";

export const sharePreviewRoute = new Hono<AppEnv>().get(
  `${SHARE_PREVIEW_ROUTE_PATH}/*`,
  async (c) => {
    const url = new URL(c.req.url);
    const prefixEnd = url.pathname.indexOf(SHARE_PREVIEW_ROUTE_PATH) + SHARE_PREVIEW_ROUTE_PATH.length;
    const request = parseSharePreviewPath(`${url.pathname.slice(prefixEnd)}${url.search}`);
    if (!request) return c.body(null, 204);
    const preview = await loadSharePreview(request);
    c.header("Cache-Control", "no-store");
    return c.html(renderSharePreviewHtml(preview, getWebUrl()));
  },
);
