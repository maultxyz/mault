import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { addCollectionRoute } from "./add";
import { addCollectionCardRoute } from "./cards-add";
import { collectionCardBinsRoute } from "./cards-bins";
import { clearCollectionCardsRoute } from "./cards-clear";
import { deleteCollectionCardRoute } from "./cards-delete";
import { collectionCardImageRoute } from "./cards-image";
import { editCollectionCardRoute } from "./cards-edit";
import { exportCollectionCardsRoute } from "./cards-export";
import { collectionCardIdsRoute } from "./cards-ids";
import { listCollectionCardsRoute } from "./cards-list";
import { markCollectionCardsDownloadedRoute } from "./cards-mark-downloaded";
import { collectionCardPositionRoute } from "./cards-position";
import { removeBulkCollectionCardsRoute } from "./cards-remove-bulk";
import { collectionCardsSummaryRoute } from "./cards-summary";
import { checkCollectionNameRoute } from "./check-name";
import { debugErrorRoute } from "./debug-error";
import { deleteCollectionRoute } from "./delete";
import { editCollectionRoute } from "./edit";
import { listCollectionsRoute } from "./list";
import { locksRoute } from "./locks";
import { phoneCameraSignalRoute } from "./phone-camera-signal";
import { releaseScanLockRoute } from "./scan-lock-release";
import { setCollectionActiveRoute } from "./set-active";
import { addUnmatchedCardRoute } from "./unmatched-add";
import { clearUnmatchedCardsRoute } from "./unmatched-clear";
import { deleteUnmatchedCardRoute } from "./unmatched-delete";
import { listUnmatchedCardsRoute } from "./unmatched-list";

const router = new Hono<AppEnv>()
  .route("/", listCollectionsRoute)
  .route("/", locksRoute)
  .route("/", checkCollectionNameRoute)
  .route("/", addCollectionRoute)
  .route("/", editCollectionRoute)
  .route("/", setCollectionActiveRoute)
  .route("/", deleteCollectionRoute)
  .route("/", listCollectionCardsRoute)
  .route("/", collectionCardsSummaryRoute)
  .route("/", collectionCardIdsRoute)
  .route("/", exportCollectionCardsRoute)
  .route("/", collectionCardBinsRoute)
  .route("/", collectionCardPositionRoute)
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
  .route("/", phoneCameraSignalRoute);

export { router as collectionsRouter };
