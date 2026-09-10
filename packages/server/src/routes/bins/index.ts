import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addBinSetRoute } from "./add";
import { checkBinSetNameRoute } from "./check-name";
import { copyBinSetRoute } from "./copy";
import { deleteBinSetRoute } from "./delete";
import { deleteBinRoute } from "./delete-bin";
import { editBinSetRoute } from "./edit";
import { editBinRoute } from "./edit-bin";
import { binSetHistoryRoute } from "./history";
import { listBinSetsRoute } from "./list";
import { resetAutoAssignRoute } from "./reset-auto-assign";
import { revertBinSetRoute } from "./revert";
import { setBinSetActiveRoute } from "./set-active";
import { setAutoAssignRoute } from "./set-auto-assign";
import { setScanOnlyRoute } from "./set-scan-only";

const router = new Hono<AppEnv>()
  .route("/", checkBinSetNameRoute)
  .route("/", listBinSetsRoute)
  .route("/", setBinSetActiveRoute)
  .route("/", addBinSetRoute)
  .route("/", copyBinSetRoute)
  .route("/", editBinRoute)
  .route("/", deleteBinRoute)
  .route("/", editBinSetRoute)
  .route("/", setAutoAssignRoute)
  .route("/", resetAutoAssignRoute)
  .route("/", setScanOnlyRoute)
  .route("/", deleteBinSetRoute)
  .route("/", binSetHistoryRoute)
  .route("/", revertBinSetRoute);

export { router as sortBinsRouter };
