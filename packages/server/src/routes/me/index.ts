import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { meOrganizationsRoute } from "./organizations";
import { meSessionRoute } from "./session";

const router = new Hono<AppEnv>()
  .route("/", meSessionRoute)
  .route("/", meOrganizationsRoute);

export { router as meRouter };
