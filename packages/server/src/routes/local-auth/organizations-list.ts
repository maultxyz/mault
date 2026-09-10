import { Hono } from "hono";
import { authProvider } from "../../auth";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const listOrganizationsRoute = new Hono<AppEnv>().get(
  "/organizations",
  requireAuth,
  async (c) => {
    const orgs = await authProvider.listUserOrganisations(c.get("userId"));
    return c.json({ success: true, data: orgs });
  },
);
