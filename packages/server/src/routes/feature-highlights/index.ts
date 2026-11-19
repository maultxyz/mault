import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { listFeatureHighlightsRoute } from "./list";
import { markFeatureHighlightsSeenRoute } from "./seen";
import { featureHighlightTimelineRoute } from "./timeline";

const router = new Hono<AppEnv>()
  .route("/", featureHighlightTimelineRoute)
  .route("/", listFeatureHighlightsRoute)
  .route("/", markFeatureHighlightsSeenRoute);

export { router as featureHighlightsRouter };
