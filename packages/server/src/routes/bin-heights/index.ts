import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { deleteBinHeightRoute } from "./delete";
import { editBinHeightRoute } from "./edit";
import { getBinHeightsRoute } from "./get";
import { binHeightHistoryRoute } from "./history";
import { revertBinHeightRoute } from "./revert";

const router = new Hono<AppEnv>()
  .route("/", getBinHeightsRoute)
  .route("/", editBinHeightRoute)
  .route("/", deleteBinHeightRoute)
  .route("/", binHeightHistoryRoute)
  .route("/", revertBinHeightRoute);

export { router as binHeightsRouter };
