import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { deleteBinRouteRoute } from "./delete";
import { editBinRouteRoute } from "./edit";
import { getBinRoutesRoute } from "./get";
import { binRouteHistoryRoute } from "./history";
import { revertBinRouteRoute } from "./revert";

const router = new Hono<AppEnv>()
  .route("/", getBinRoutesRoute)
  .route("/", editBinRouteRoute)
  .route("/", deleteBinRouteRoute)
  .route("/", binRouteHistoryRoute)
  .route("/", revertBinRouteRoute);

export { router as binRoutesRouter };
