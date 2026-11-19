import {
  PLATFORM_STAFF_ROLES,
  type UploadedFeatureHighlightMedia,
} from "@magic-vault/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { featureHighlights } from "../../db/schema";
import { FEATURE_HIGHLIGHT_GUID_PATTERN } from "../../lib/constants/feature-highlights";
import { OBJECT_STORAGE_ENABLED } from "../../lib/constants/object-storage";
import {
  adminFeatureHighlightInputSchema,
  firstIssueMessage,
} from "../../lib/feature-highlight-input";
import {
  parseFeatureHighlightMediaUpload,
  resolveFeatureHighlightMediaUrl,
  storeFeatureHighlightMedia,
} from "../../lib/feature-highlight-media";
import {
  invalidateFeatureHighlightsCache,
  toAdminFeatureHighlight,
  toPersistedFeatureHighlightSlides,
} from "../../lib/feature-highlights";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

const liveFeatureHighlight = (guid: string) =>
  FEATURE_HIGHLIGHT_GUID_PATTERN.test(guid)
    ? and(eq(featureHighlights.guid, guid), eq(featureHighlights.isDeleted, false))
    : sql`false`;

const featureHighlightNotFound = {
  success: false,
  message: "Feature highlight not found.",
} as const;

export const featureHighlightsAdminRoute = new Hono<AppEnv>()
  .get(
    "/feature-highlights",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const rows = await db
        .select()
        .from(featureHighlights)
        .where(eq(featureHighlights.isDeleted, false))
        .orderBy(desc(featureHighlights.publishedAt));
      return c.json({
        success: true,
        data: await Promise.all(rows.map(toAdminFeatureHighlight)),
      });
    },
  )
  .post(
    "/feature-highlights/media",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const upload = parseFeatureHighlightMediaUpload(
        await c.req.parseBody(),
        OBJECT_STORAGE_ENABLED,
      );
      if (!upload.success) {
        return c.json({ success: false, message: upload.message }, 400);
      }
      const storedUrl = await storeFeatureHighlightMedia(
        Buffer.from(await upload.file.arrayBuffer()),
        upload.contentType,
      );
      const data: UploadedFeatureHighlightMedia = {
        url: (await resolveFeatureHighlightMediaUrl(storedUrl))!,
        mediaType: upload.mediaType,
      };
      return c.json({ success: true, data });
    },
  )
  .post(
    "/feature-highlights",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const parsed = adminFeatureHighlightInputSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) {
        return c.json(
          { success: false, message: firstIssueMessage(parsed.error) },
          400,
        );
      }
      const [row] = await db
        .insert(featureHighlights)
        .values({
          isPublished: parsed.data.isPublished,
          publishedAt: new Date(parsed.data.publishedAt),
          slides: toPersistedFeatureHighlightSlides(parsed.data.slides),
        })
        .returning();
      invalidateFeatureHighlightsCache();
      return c.json({ success: true, data: await toAdminFeatureHighlight(row) });
    },
  )
  .put(
    "/feature-highlights/:guid",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const parsed = adminFeatureHighlightInputSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) {
        return c.json(
          { success: false, message: firstIssueMessage(parsed.error) },
          400,
        );
      }
      const [row] = await db
        .update(featureHighlights)
        .set({
          isPublished: parsed.data.isPublished,
          publishedAt: new Date(parsed.data.publishedAt),
          slides: toPersistedFeatureHighlightSlides(parsed.data.slides),
          updatedAt: new Date(),
        })
        .where(liveFeatureHighlight(c.req.param("guid")))
        .returning();
      if (!row) return c.json(featureHighlightNotFound, 404);
      invalidateFeatureHighlightsCache();
      return c.json({ success: true, data: await toAdminFeatureHighlight(row) });
    },
  )
  .delete(
    "/feature-highlights/:guid",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const [row] = await db
        .update(featureHighlights)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(liveFeatureHighlight(c.req.param("guid")))
        .returning({ id: featureHighlights.id });
      if (!row) return c.json(featureHighlightNotFound, 404);
      invalidateFeatureHighlightsCache();
      return c.json({ success: true, data: null });
    },
  );
