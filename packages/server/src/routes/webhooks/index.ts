import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addWebhookRoute } from "./add";
import { deleteWebhookRoute } from "./delete";
import { editWebhookRoute } from "./edit";
import { listWebhooksRoute } from "./list";
import { testWebhookRoute } from "./test";

const router = new Hono<AppEnv>()
  .route("/", listWebhooksRoute)
  .route("/", addWebhookRoute)
  .route("/", editWebhookRoute)
  .route("/", testWebhookRoute)
  .route("/", deleteWebhookRoute);

export { router as webhooksRouter };
