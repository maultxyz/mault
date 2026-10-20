import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { imageProxyRoute } from "./image-proxy";
import { netdeckImageRoute } from "./netdeck-image";
import { searchByImageRoute } from "./search-by-image";
import { searchByTextRoute } from "./search-by-text";
import { printingScoreRoute } from "./printing-score";
import { searchByVectorRoute } from "./search-by-vector";
import { searchCardByIdRoute } from "./search-by-id";
import { searchCardRoute } from "./search";
import { setPrintingsRoute } from "./set-printings";
import { cardSetsRoute } from "./sets";
import { sampleCardRoute } from "./sample";

const router = new Hono<AppEnv>()
  .route("/", searchByImageRoute)
  .route("/", searchByVectorRoute)
  .route("/", printingScoreRoute)
  .route("/", searchByTextRoute)
  .route("/", cardSetsRoute)
  .route("/", setPrintingsRoute)
  .route("/", sampleCardRoute)
  .route("/", searchCardRoute)
  .route("/", searchCardByIdRoute)
  .route("/", imageProxyRoute)
  .route("/", netdeckImageRoute);

export { router as cardRouter };
