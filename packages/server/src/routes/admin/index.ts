import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { activeScanningRoute } from "./active-scanning";
import { cardsDumpRoute } from "./cards-dump";
import { cardsGamesRoute } from "./cards-games";
import { cardsListRoute } from "./cards-list";
import { cardsRevectorizeRoute } from "./cards-revectorize";
import { cardsSyncRoute } from "./cards-sync";
import { deletedItemsRoute } from "./deleted-items";
import { plansRoute } from "./plans";
import { platformStatsRoute } from "./platform-stats";
import { rollbarTestRoute } from "./rollbar-test";
import { scanVectorizeStatsRoute } from "./scan-vectorize-stats";
import { syncCancelRoute } from "./sync-cancel";
import { syncSourcesRoute } from "./sync-sources";
import { syncStartRoute } from "./sync-start";
import { syncStatusRoute } from "./sync-status";

const router = new Hono<AppEnv>()
  .route("/", syncStatusRoute)
  .route("/", syncSourcesRoute)
  .route("/", syncStartRoute)
  .route("/", syncCancelRoute)
  .route("/", cardsListRoute)
  .route("/", cardsSyncRoute)
  .route("/", cardsRevectorizeRoute)
  .route("/", cardsGamesRoute)
  .route("/", cardsDumpRoute)
  .route("/", rollbarTestRoute)
  .route("/", scanVectorizeStatsRoute)
  .route("/", activeScanningRoute)
  .route("/", plansRoute)
  .route("/", platformStatsRoute)
  .route("/", deletedItemsRoute);

export { router as adminRouter };
