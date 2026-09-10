import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import type { AppEnv } from "../../middleware/auth";

export const signOutRoute = new Hono<AppEnv>().post("/sign-out", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) await getOwnAuth().signOut(token);
  return c.json({ success: true, data: null });
});
