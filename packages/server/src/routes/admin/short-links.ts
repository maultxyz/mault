import {
  PLATFORM_STAFF_ROLES,
  buildShortenerUrl,
  customShortLinkFormSchema,
  customShortLinkUpdateSchema,
  type CustomShortLink,
  type CustomShortLinkFailureReason,
  type CustomShortLinkResult,
  type CustomShortLinksOverview,
  type ShortenerCustomLink,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { shareLinks, shopCatalogs } from "../../db/schema";
import { CUSTOM_SHORT_LINK_FAILURE_MESSAGES } from "../../lib/constants/short-links";
import { getShortLinkBaseUrl } from "../../lib/constants/urls";
import {
  createCustomShortLink,
  deleteCustomShortLink,
  listCustomShortLinks,
  updateCustomShortLink,
} from "../../lib/shortener-client";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function toCustomShortLink(baseUrl: string, link: ShortenerCustomLink): CustomShortLink {
  return { ...link, shortUrl: buildShortenerUrl(baseUrl, link.code) };
}

function failure(c: Context, reason: CustomShortLinkFailureReason) {
  const body: CustomShortLinkResult<null> = {
    success: false,
    reason,
    message: CUSTOM_SHORT_LINK_FAILURE_MESSAGES[reason],
  };
  return c.json(body);
}

async function isUsedByAppLink(code: string): Promise<boolean> {
  const [shareLink] = await db
    .select({ id: shareLinks.id })
    .from(shareLinks)
    .where(eq(shareLinks.shortCode, code))
    .limit(1);
  if (shareLink) return true;
  const [catalog] = await db
    .select({ id: shopCatalogs.id })
    .from(shopCatalogs)
    .where(eq(shopCatalogs.shortCode, code))
    .limit(1);
  return !!catalog;
}

export const shortLinksRoute = new Hono<AppEnv>()
  .get("/short-links", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const baseUrl = getShortLinkBaseUrl();
    const links = baseUrl ? await listCustomShortLinks() : [];
    const data: CustomShortLinksOverview = {
      enabled: !!baseUrl,
      shortLinkBaseUrl: baseUrl,
      links: baseUrl ? links.map((link) => toCustomShortLink(baseUrl, link)) : [],
    };
    return c.json({ success: true, data });
  })
  .post("/short-links", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const input = customShortLinkFormSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) {
      return c.json({ success: false, message: "Invalid short link." }, 400);
    }
    const baseUrl = getShortLinkBaseUrl();
    if (!baseUrl) return failure(c, "disabled");
    if (await isUsedByAppLink(input.data.code)) return failure(c, "codeTaken");
    const created = await createCustomShortLink(input.data);
    if (!created) return failure(c, "codeTaken");
    const body: CustomShortLinkResult<CustomShortLink> = {
      success: true,
      data: toCustomShortLink(baseUrl, created),
    };
    return c.json(body);
  })
  .put("/short-links/:code", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    const input = customShortLinkUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) {
      return c.json({ success: false, message: "Invalid short link." }, 400);
    }
    const baseUrl = getShortLinkBaseUrl();
    if (!baseUrl) return failure(c, "disabled");
    const updated = await updateCustomShortLink(c.req.param("code"), input.data);
    if (!updated) return failure(c, "notFound");
    const body: CustomShortLinkResult<CustomShortLink> = {
      success: true,
      data: toCustomShortLink(baseUrl, updated),
    };
    return c.json(body);
  })
  .delete("/short-links/:code", requireAuth, requireRole(...PLATFORM_STAFF_ROLES), async (c) => {
    if (!getShortLinkBaseUrl()) return failure(c, "disabled");
    if (!(await deleteCustomShortLink(c.req.param("code")))) return failure(c, "notFound");
    return c.json({ success: true, data: null });
  });
