import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { impersonationAudit } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const stopImpersonationRoute = new Hono<AppEnv>().post(
  "/impersonate/stop",
  requireAuth,
  async (c) => {
    const adminUserId = c.get("impersonatedBy");
    const targetUserId = c.get("userId");

    if (!adminUserId) {
      return c.json(
        { success: false, message: "Not currently impersonating." },
        400,
      );
    }

    const [open] = await db
      .select({ id: impersonationAudit.id })
      .from(impersonationAudit)
      .where(
        and(
          eq(impersonationAudit.adminUserId, adminUserId),
          eq(impersonationAudit.targetUserId, targetUserId),
          isNull(impersonationAudit.endedAt),
        ),
      )
      .orderBy(desc(impersonationAudit.startedAt))
      .limit(1);

    if (open) {
      await db
        .update(impersonationAudit)
        .set({ endedAt: new Date() })
        .where(eq(impersonationAudit.id, open.id));
    }

    return c.json({ success: true, data: null });
  },
);
