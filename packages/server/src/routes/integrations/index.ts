import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { setDiscordChannelRoute } from "./discord-channels";
import { getDiscordIntegrationRoute } from "./discord-get";
import { addNotificationRuleRoute } from "./discord-rules-add";
import { deleteNotificationRuleRoute } from "./discord-rules-delete";
import { editNotificationRuleRoute } from "./discord-rules-edit";
import { listNotificationRulesRoute } from "./discord-rules-list";

const router = new Hono<AppEnv>()
  .route("/", getDiscordIntegrationRoute)
  .route("/", setDiscordChannelRoute)
  .route("/", listNotificationRulesRoute)
  .route("/", addNotificationRuleRoute)
  .route("/", editNotificationRuleRoute)
  .route("/", deleteNotificationRuleRoute);

export { router as integrationsRouter };
