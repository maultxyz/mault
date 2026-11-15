import { Hono } from "hono";
import { and, asc, eq, sql } from "drizzle-orm";
import { importTemplates } from "../db/schema";
import { authQuery } from "../db";
import { UUID_PATTERN } from "../lib/constants/validation";
import { importTemplateInputSchema } from "@magic-vault/shared";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

export const importTemplatesRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const type = c.req.query("type");
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      tx
        .select({
          guid: importTemplates.guid,
          name: importTemplates.name,
          type: importTemplates.type,
          mapping: importTemplates.mapping,
          createdAt: importTemplates.createdAt,
          updatedAt: importTemplates.updatedAt,
        })
        .from(importTemplates)
        .where(
          type
            ? and(
                eq(importTemplates.orgId, c.get("orgId")),
                eq(importTemplates.isDeleted, false),
                eq(importTemplates.type, type),
              )
            : and(
                eq(importTemplates.orgId, c.get("orgId")),
                eq(importTemplates.isDeleted, false),
              ),
        )
        .orderBy(asc(importTemplates.name)),
    );
    return c.json({ success: true, data });
  })
  .post("/", requireAuth, requireOrg, async (c) => {
    const parsed = importTemplateInputSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid template." }, 400);
    }
    const { name, type, mapping } = parsed.data;
    const guid = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx
        .select({ guid: importTemplates.guid })
        .from(importTemplates)
        .where(
          and(
            eq(importTemplates.orgId, c.get("orgId")),
            eq(importTemplates.type, type),
            eq(importTemplates.isDeleted, false),
            sql`lower(${importTemplates.name}) = lower(${name})`,
          ),
        );
      if (existing.length > 0) {
        await tx
          .update(importTemplates)
          .set({ name, mapping, updatedAt: new Date() })
          .where(eq(importTemplates.guid, existing[0].guid));
        return existing[0].guid;
      }
      const [row] = await tx
        .insert(importTemplates)
        .values({ orgId: c.get("orgId"), name, type, mapping })
        .returning({ guid: importTemplates.guid });
      return row.guid;
    });
    return c.json({ success: true, data: { guid } });
  })
  .delete("/:guid", requireAuth, requireOrg, async (c) => {
    const guid = c.req.param("guid");
    if (!UUID_PATTERN.test(guid)) {
      return c.json({ success: false, message: "Invalid template." }, 400);
    }
    const deleted = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx
        .update(importTemplates)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(
          and(
            eq(importTemplates.guid, guid),
            eq(importTemplates.orgId, c.get("orgId")),
          ),
        )
        .returning({ guid: importTemplates.guid });
      return rows.length > 0;
    });
    if (!deleted) {
      return c.json({ success: false, message: "Import template not found." }, 404);
    }
    return c.json({ success: true });
  });
