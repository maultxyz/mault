import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { db } from "../../db";
import { getOrCreateDevice } from "../../lib/devices";
import { requireAuth, type AppEnv } from "../../middleware/auth";

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
  await db.transaction((tx) => getOrCreateDevice(tx, organisation.id));
  return c.json({ success: true, data: [organisation] });
});
