import { Hono } from "hono";
import { authProvider } from "../../auth";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const meSessionRoute = new Hono<AppEnv>().get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const contact = await authProvider.getUserContact(userId);
  return c.json({
    success: true,
    data: {
      id: userId,
      name: contact.name,
      email: contact.email,
      role: c.get("userRole"),
    },
  });
});
