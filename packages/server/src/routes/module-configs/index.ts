import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { editModuleConfigRoute } from "./edit";
import { getModuleConfigsRoute } from "./get";
import { moduleConfigHistoryRoute } from "./history";
import { revertModuleConfigRoute } from "./revert";

const router = new Hono<AppEnv>()
  .route("/", getModuleConfigsRoute)
  .route("/", editModuleConfigRoute)
  .route("/", moduleConfigHistoryRoute)
  .route("/", revertModuleConfigRoute);

export { router as moduleConfigsRouter };
