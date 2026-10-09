import { Hono } from "hono";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import { publicCardsRoute } from "./cards";
import { publicCatalogRoute } from "./catalog";

const router = new Hono<ApiKeyEnv>()
  .route("/", publicCatalogRoute)
  .route("/", publicCardsRoute);

export { router as publicApiRouter };
