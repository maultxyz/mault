import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { listFeatureHighlightsRoute } from "./list";
import { markFeatureHighlightsSeenRoute } from "./seen";

const router = new Hono<AppEnv>()
  .route("/", listFeatureHighlightsRoute)
  .route("/", markFeatureHighlightsSeenRoute);

export { router as featureHighlightsRouter };
