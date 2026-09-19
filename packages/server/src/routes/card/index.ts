import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { imageProxyRoute } from "./image-proxy";
import { searchByImageRoute } from "./search-by-image";
import { searchByVectorRoute } from "./search-by-vector";
import { searchCardByIdRoute } from "./search-by-id";
import { searchCardRoute } from "./search";

const router = new Hono<AppEnv>()
  .route("/", searchByImageRoute)
  .route("/", searchByVectorRoute)
  .route("/", searchCardRoute)
  .route("/", searchCardByIdRoute)
  .route("/", imageProxyRoute);

export { router as cardRouter };
