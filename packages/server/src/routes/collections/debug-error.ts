import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import {
  requireAuth,
  requireOrg,
  requireRole,
  type AppEnv,
} from "../../middleware/auth";

export const debugErrorRoute = new Hono<AppEnv>().post(
  "/:guid/debug/error",
  requireAuth,
  requireRole("admin"),
  requireOrg,
  async (c) => {
    const guid = c.req.param("guid");
    const orgId = c.get("orgId");
    const [collection] = await authQuery(c.get("jwtClaims"), (tx) =>
      tx
        .select({ guid: collections.guid })
        .from(collections)
        .where(
          and(
            eq(collections.guid, guid),
            eq(collections.orgId, orgId),
            eq(collections.isDeleted, false),
          ),
        )
        .limit(1),
    );
    if (!collection) {
      return c.json({ success: false, message: "Collection not found." }, 404);
    }
    emitToSession(guid, "scan_error", {
      message: "Debug: forced error triggered.",
      timestamp: Date.now(),
    });
    return c.json({ success: true, data: null });
  },
);
