import { desc } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { impersonationAudit } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

// GET /admin/impersonation-audit — admin-only. Read-only history of past
// (and currently open) impersonation sessions, most recent first.
export const impersonationAuditRoute = new Hono<AppEnv>().get(
  "/impersonation-audit",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const rows = await db
      .select({
        guid: impersonationAudit.guid,
        adminEmail: impersonationAudit.adminEmail,
        targetEmail: impersonationAudit.targetEmail,
        startedAt: impersonationAudit.startedAt,
        endedAt: impersonationAudit.endedAt,
      })
      .from(impersonationAudit)
      .orderBy(desc(impersonationAudit.startedAt))
      .limit(50);

    return c.json({ success: true, data: rows });
  },
);
