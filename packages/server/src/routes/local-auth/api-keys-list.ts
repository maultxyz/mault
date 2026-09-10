import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { requireAuth, type AppEnv } from "../../middleware/auth";

// API keys - personal only (never created with an organisationId). An
// org-scoped key has no associated user at all (own-auth sets userId: null
// for those), which doesn't map onto requireAuth/requireOrg's assumption
// that every authenticated request acts as a specific person - rather than
// extend that core model overnight, keys here behave exactly like a normal
// user session (requireOrg's usual org-membership check still applies to
// whatever X-Org-Id the request sends), just longer-lived and scriptable.
export const listApiKeysRoute = new Hono<AppEnv>().get("/api-keys", requireAuth, async (c) => {
  const keys = await getOwnAuth().listApiKeys({ actorUserId: c.get("userId") });
  return c.json({ success: true, data: keys });
});
