import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { imageProxyRoute } from "./image-proxy";
import { searchByImageRoute } from "./search-by-image";
import { searchByTextRoute } from "./search-by-text";
import { searchByVectorRoute } from "./search-by-vector";
import { searchCardByIdRoute } from "./search-by-id";
import { searchCardRoute } from "./search";
import { cardSetsRoute } from "./sets";

const router = new Hono<AppEnv>()
  .route("/", searchByImageRoute)
  .route("/", searchByVectorRoute)
  .route("/", searchByTextRoute)
  .route("/", cardSetsRoute)
  .route("/", searchCardRoute)
  .route("/", searchCardByIdRoute)
  .route("/", imageProxyRoute);

export { router as cardRouter };
