import {
  MARKETING_OPEN_GRAPH_PAGES,
  OPEN_GRAPH_IMAGE_CONTENT_TYPE,
  OPEN_GRAPH_IMAGE_FILE_EXTENSION,
  OPEN_GRAPH_IMAGE_PAGES_SEGMENT,
  OPEN_GRAPH_IMAGE_ROUTE_PATH,
  OPEN_GRAPH_IMAGE_THEME_PARAM,
  OPEN_GRAPH_THEMES,
  isMarketingOpenGraphPageKey,
  marketingOpenGraphImageAlt,
  openGraphThemeOf,
} from "@magic-vault/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import {
  OPEN_GRAPH_PAGE_IMAGE_CACHE_CONTROL,
  OPEN_GRAPH_PAGE_IMAGE_CACHE_TTL_MS,
  OPEN_GRAPH_RATE_LIMIT_KEY_PREFIX,
  OPEN_GRAPH_SHARE_IMAGE_CACHE_CONTROL,
  OPEN_GRAPH_SHARE_IMAGE_CACHE_MAX_ENTRIES,
  OPEN_GRAPH_SHARE_IMAGE_CACHE_TTL_MS,
} from "../../lib/constants/open-graph-image";
import { renderOpenGraphImage } from "../../lib/open-graph-image";
import { rejectWhenShareLinkRateLimited } from "../../lib/share-link-rate-limit";
import { loadSharePreview, sharePreviewCacheKey } from "../../lib/share-preview";
import { parseSharePreviewPath } from "../../lib/share-preview-html";
import { createTtlCache } from "../../lib/ttl-cache";
import type { AppEnv } from "../../middleware/auth";

const pageImageCache = createTtlCache<Buffer>({
  name: "openGraph.pageImages",
  ttlMs: OPEN_GRAPH_PAGE_IMAGE_CACHE_TTL_MS,
  maxEntries: Object.keys(MARKETING_OPEN_GRAPH_PAGES).length * OPEN_GRAPH_THEMES.length,
});

const shareImageCache = createTtlCache<Buffer>({
  name: "openGraph.shareImages",
  hasSecretKeys: true,
  ttlMs: OPEN_GRAPH_SHARE_IMAGE_CACHE_TTL_MS,
  maxEntries: OPEN_GRAPH_SHARE_IMAGE_CACHE_MAX_ENTRIES,
});

function imageResponse(c: Context<AppEnv>, image: Buffer, cacheControl: string) {
  return c.body(new Uint8Array(image), 200, {
    "Content-Type": OPEN_GRAPH_IMAGE_CONTENT_TYPE,
    "Cache-Control": cacheControl,
  });
}

const pagesPathPrefix = `${OPEN_GRAPH_IMAGE_ROUTE_PATH}/${OPEN_GRAPH_IMAGE_PAGES_SEGMENT}/`;

export const openGraphImageRoute = new Hono<AppEnv>()
  .get(`${pagesPathPrefix}:pageFile`, async (c) => {
    const pageFile = c.req.param("pageFile");
    const pageKey = pageFile.endsWith(OPEN_GRAPH_IMAGE_FILE_EXTENSION)
      ? pageFile.slice(0, -OPEN_GRAPH_IMAGE_FILE_EXTENSION.length)
      : pageFile;
    if (!isMarketingOpenGraphPageKey(pageKey)) return c.notFound();
    const theme = openGraphThemeOf(c.req.query(OPEN_GRAPH_IMAGE_THEME_PARAM));
    const cacheKey = `${pageKey}|${theme}`;
    let image = pageImageCache.get(cacheKey);
    if (!image) {
      image = await renderOpenGraphImage({
        ...MARKETING_OPEN_GRAPH_PAGES[pageKey],
        visual: { kind: "sorterPhoto" },
        alt: marketingOpenGraphImageAlt(pageKey),
      }, theme);
      pageImageCache.set(cacheKey, image);
    }
    return imageResponse(c, image, OPEN_GRAPH_PAGE_IMAGE_CACHE_CONTROL);
  })
  .get(`${OPEN_GRAPH_IMAGE_ROUTE_PATH}/*`, async (c) => {
    const url = new URL(c.req.url);
    const prefixEnd = url.pathname.indexOf(OPEN_GRAPH_IMAGE_ROUTE_PATH) + OPEN_GRAPH_IMAGE_ROUTE_PATH.length;
    const request = parseSharePreviewPath(`${url.pathname.slice(prefixEnd)}${url.search}`);
    if (!request) return c.notFound();
    const preview = await loadSharePreview(request);
    if (!preview.openGraphImage) return c.notFound();
    const theme = openGraphThemeOf(url.searchParams.get(OPEN_GRAPH_IMAGE_THEME_PARAM));
    const cacheKey = `${sharePreviewCacheKey(request)}|${theme}`;
    const cached = shareImageCache.get(cacheKey);
    if (cached) return imageResponse(c, cached, OPEN_GRAPH_SHARE_IMAGE_CACHE_CONTROL);
    const rejection = rejectWhenShareLinkRateLimited(
      c,
      request.token ?? `${OPEN_GRAPH_RATE_LIMIT_KEY_PREFIX}${request.subjectGuid}`,
    );
    if (rejection) return rejection;
    const image = await renderOpenGraphImage(preview.openGraphImage, theme);
    shareImageCache.set(cacheKey, image);
    return imageResponse(c, image, OPEN_GRAPH_SHARE_IMAGE_CACHE_CONTROL);
  });
