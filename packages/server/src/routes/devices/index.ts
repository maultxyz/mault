import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { binHeightsRouter } from "../bin-heights";
import { binRoutesRouter } from "../bin-routes";
import { feederRouter } from "../feeder";
import { moduleConfigsRouter } from "../module-configs";
import { createDeviceRoute } from "./create";
import { deleteDeviceRoute } from "./delete";
import { editDeviceRoute } from "./edit";
import { getDeviceRoute } from "./get";
import { acquireDeviceLeaseRoute, releaseDeviceLeaseRoute } from "./lease";
import { listDevicesRoute } from "./list";
import { resolveDeviceRoute } from "./resolve";

const router = new Hono<AppEnv>()
  .route("/", listDevicesRoute)
  .route("/", createDeviceRoute)
  .route("/", resolveDeviceRoute)
  .route("/", acquireDeviceLeaseRoute)
  .route("/", releaseDeviceLeaseRoute)
  .route("/", getDeviceRoute)
  .route("/", editDeviceRoute)
  .route("/", deleteDeviceRoute)
  .route("/:guid/modules", moduleConfigsRouter)
  .route("/:guid/bin-routes", binRoutesRouter)
  .route("/:guid/bin-heights", binHeightsRouter)
  .route("/:guid/feeder", feederRouter);

export { router as devicesRouter };
