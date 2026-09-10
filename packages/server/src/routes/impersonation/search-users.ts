import { Hono } from "hono";
import { authProvider } from "../../auth";
import { validateQuery } from "../../lib/card-search/validate";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const searchUsersRoute = new Hono<AppEnv>().get(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const search = (c.req.query("search") ?? "").trim();
    const invalid = validateQuery(search);
    if (invalid) return c.json(invalid);

    const users = await authProvider.searchUsers(search, 20);
    return c.json({ success: true, data: users });
  },
);
