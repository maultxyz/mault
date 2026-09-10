import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addCollectionRoute } from "./add";
import { addCollectionCardRoute } from "./cards-add";
import { clearCollectionCardsRoute } from "./cards-clear";
import { deleteCollectionCardRoute } from "./cards-delete";
import { collectionCardImageRoute } from "./cards-image";
import { editCollectionCardRoute } from "./cards-edit";
import { listCollectionCardsRoute } from "./cards-list";
import { markCollectionCardsDownloadedRoute } from "./cards-mark-downloaded";
import { removeBulkCollectionCardsRoute } from "./cards-remove-bulk";
import { checkCollectionNameRoute } from "./check-name";
import { debugErrorRoute } from "./debug-error";
import { deleteCollectionRoute } from "./delete";
import { editCollectionRoute } from "./edit";
import { listCollectionsRoute } from "./list";
import { liveEventsRoute } from "./live-events";
import { lockEventsRoute } from "./lock-events";
import { locksRoute } from "./locks";
import { phoneCameraSignalRoute } from "./phone-camera-signal";
import { releaseScanLockRoute } from "./scan-lock-release";
import { setCollectionActiveRoute } from "./set-active";
import { collectionStreamRoute } from "./stream";
import { addUnmatchedCardRoute } from "./unmatched-add";
import { clearUnmatchedCardsRoute } from "./unmatched-clear";
import { deleteUnmatchedCardRoute } from "./unmatched-delete";
import { listUnmatchedCardsRoute } from "./unmatched-list";

const router = new Hono<AppEnv>()
  .route("/", listCollectionsRoute)
  .route("/", lockEventsRoute)
  .route("/", locksRoute)
  .route("/", liveEventsRoute)
  .route("/", checkCollectionNameRoute)
  .route("/", addCollectionRoute)
  .route("/", editCollectionRoute)
  .route("/", setCollectionActiveRoute)
  .route("/", deleteCollectionRoute)
  .route("/", listCollectionCardsRoute)
  .route("/", addCollectionCardRoute)
  .route("/", collectionCardImageRoute)
  .route("/", editCollectionCardRoute)
  .route("/", clearCollectionCardsRoute)
  .route("/", removeBulkCollectionCardsRoute)
  .route("/", markCollectionCardsDownloadedRoute)
  .route("/", deleteCollectionCardRoute)
  .route("/", listUnmatchedCardsRoute)
  .route("/", addUnmatchedCardRoute)
  .route("/", clearUnmatchedCardsRoute)
  .route("/", deleteUnmatchedCardRoute)
  .route("/", releaseScanLockRoute)
  .route("/", debugErrorRoute)
  .route("/", phoneCameraSignalRoute)
  .route("/", collectionStreamRoute);

export { router as collectionsRouter };
