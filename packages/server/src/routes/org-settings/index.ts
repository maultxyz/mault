import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { discordLinkCodeRoute } from "./discord-link-code";
import { discordUnlinkRoute } from "./discord-unlink";
import { deleteOrgDataRoute } from "./delete-org-data";
import { editOrgSettingsRoute } from "./edit";
import { getOrgSettingsRoute } from "./get";

const router = new Hono<AppEnv>()
  .route("/", getOrgSettingsRoute)
  .route("/", editOrgSettingsRoute)
  .route("/", discordLinkCodeRoute)
  .route("/", discordUnlinkRoute)
  .route("/", deleteOrgDataRoute);

export { router as orgSettingsRouter };
