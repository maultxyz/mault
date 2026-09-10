import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { editFeederRoute } from "./edit";
import { getFeederRoute } from "./get";
import { feederHistoryRoute } from "./history";
import { revertFeederRoute } from "./revert";

const router = new Hono<AppEnv>()
  .route("/", getFeederRoute)
  .route("/", editFeederRoute)
  .route("/", feederHistoryRoute)
  .route("/", revertFeederRoute);

export { router as feederRouter };
