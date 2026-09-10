import { Hono } from "hono";
import { authProvider } from "../../auth";
import { db } from "../../db";
import { impersonationAudit } from "../../db/schema";
import {
  getUserContact,
  getUserRole,
  requireAuth,
  requireRole,
  signImpersonationToken,
  type AppEnv,
} from "../../middleware/auth";

export const startImpersonationRoute = new Hono<AppEnv>().post(
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
