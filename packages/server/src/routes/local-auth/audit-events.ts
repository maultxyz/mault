import { Hono } from "hono";
import { authProvider } from "../../auth";
import { getOwnAuth } from "../../auth/own-auth-instance";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { authErrorResponse } from "./shared";

// Org activity log - owner/admin only (own-auth grants both roles
// view_audit_events by default, checked internally by listAuditEvents
// itself as defense in depth on top of requireOrgRole here).
export const auditEventsRoute = new Hono<AppEnv>().get(
  "/audit-events",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    try {
      const events = await getOwnAuth().listAuditEvents({
        actorUserId: c.get("userId"),
        organisationId: c.get("orgId"),
      });

      const userIds = [
        ...new Set(
          events.flatMap((e) => [e.actorUserId, e.targetUserId]).filter(
            (id): id is string => !!id,
          ),
        ),
      ];
      const contacts = new Map(
        await Promise.all(
          userIds.map(
            async (id) => [id, await authProvider.getUserContact(id)] as const,
          ),
        ),
      );

      const data = events
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((e) => ({
          id: e.id,
          eventType: e.eventType,
          actor: e.actorUserId
            ? (contacts.get(e.actorUserId)?.email ?? e.actorUserId)
            : null,
          target: e.targetUserId
            ? (contacts.get(e.targetUserId)?.email ?? e.targetUserId)
            : null,
          createdAt: e.createdAt,
        }));

      return c.json({ success: true, data });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);
