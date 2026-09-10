import { Hono } from "hono";
import { authProvider } from "../../auth";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const sessionRoute = new Hono<AppEnv>().get("/session", requireAuth, async (c) => {
  const userId = c.get("userId");
  const [contact, role] = await Promise.all([
    authProvider.getUserContact(userId),
    authProvider.getUserRole(userId),
  ]);
  return c.json({
    success: true,
    data: { id: userId, name: contact.name, email: contact.email, role },
  });
});
