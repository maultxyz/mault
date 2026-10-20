import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { meDiscordRoute } from "./discord";
import { meOrganizationsRoute } from "./organizations";
import { meSessionRoute } from "./session";

const router = new Hono<AppEnv>()
  .route("/", meSessionRoute)
  .route("/", meOrganizationsRoute)
  .route("/", meDiscordRoute);

export { router as meRouter };
