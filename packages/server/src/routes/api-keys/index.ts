import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addApiKeyRoute } from "./add";
import { listApiKeysRoute } from "./list";
import { revokeApiKeyRoute } from "./revoke";

const router = new Hono<AppEnv>()
  .route("/", listApiKeysRoute)
  .route("/", addApiKeyRoute)
  .route("/", revokeApiKeyRoute);

export { router as apiKeysRouter };
