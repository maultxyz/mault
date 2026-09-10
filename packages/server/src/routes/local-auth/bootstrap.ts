import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { requireAuth, type AppEnv } from "../../middleware/auth";

// Called once right after sign-up: a brand-new user has no organisations
// yet, so create one default "Home" org rather than requiring them to
// manually create one before the app is usable. No-op if they already have
// at least one (e.g. this fires again after a later sign-in).
export const bootstrapRoute = new Hono<AppEnv>().post("/bootstrap", requireAuth, async (c) => {
  const userId = c.get("userId");
  const ownAuth = getOwnAuth();
  const existing = await ownAuth.listOrganisations({ actorUserId: userId });
  if (existing.length > 0) {
    return c.json({ success: true, data: existing });
  }

  const { organisation } = await ownAuth.createOrganisation({
    name: "Home",
    ownerUserId: userId,
  });
  return c.json({ success: true, data: [organisation] });
});
