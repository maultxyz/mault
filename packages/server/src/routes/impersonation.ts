import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../auth";
import { db } from "../db";
import { impersonationAudit } from "../db/schema";
import { validateQuery } from "../lib/card-search/validate";
import {
  getUserContact,
  getUserRole,
  requireAuth,
  requireRole,
  signImpersonationToken,
  type AppEnv,
} from "../middleware/auth";

const router = new Hono<AppEnv>();

router.get("/users", requireAuth, requireRole("admin"), async (c) => {
  const search = (c.req.query("search") ?? "").trim();
  const invalid = validateQuery(search);
  if (invalid) return c.json(invalid);

  const users = await authProvider.searchUsers(search, 20);
  return c.json({ success: true, data: users });
});

router.post("/impersonate/stop", requireAuth, async (c) => {
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
});

router.post(
  "/impersonate/:userId",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const targetUserId = c.req.param("userId");
    const adminUserId = c.get("userId");

    if (targetUserId === adminUserId) {
      return c.json(
        { success: false, message: "You can't impersonate yourself." },
        400,
      );
    }

    const target = await getUserContact(targetUserId);
    const targetRole = await getUserRole(targetUserId);
    if (!target.email) {
      return c.json({ success: false, message: "User not found." }, 404);
    }
    if (targetRole === "admin") {
      return c.json(
        { success: false, message: "Can't impersonate another admin." },
        403,
      );
    }

    const orgs = await authProvider.listUserOrganisations(targetUserId);

    const admin = await getUserContact(adminUserId);
    const { token, expiresAt } = await signImpersonationToken(
      adminUserId,
      targetUserId,
    );

    await db.insert(impersonationAudit).values({
      adminUserId,
      adminEmail: admin.email,
      targetUserId,
      targetEmail: target.email,
    });

    return c.json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: { id: targetUserId, name: target.name, email: target.email },
        orgs,
      },
    });
  },
);

// GET /admin/impersonation-audit — admin-only. Read-only history of past
// (and currently open) impersonation sessions, most recent first.
router.get(
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

export const impersonationRouter = router;
