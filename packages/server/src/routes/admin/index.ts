import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { activeScanningRoute } from "./active-scanning";
import { cardsDumpRoute } from "./cards-dump";
import { cardsGamesRoute } from "./cards-games";
import { cardsListRoute } from "./cards-list";
import { cardsRevectorizeRoute } from "./cards-revectorize";
import { cardsSyncRoute } from "./cards-sync";
import { deletedItemsRoute } from "./deleted-items";
import { discordChannelsRoute } from "./discord-channels";
import { plansRoute } from "./plans";
import { platformStatsRoute } from "./platform-stats";
import { rollbarTestRoute } from "./rollbar-test";
import { scanMetricsRoute } from "./scan-metrics";
import { scanVectorizeStatsRoute } from "./scan-vectorize-stats";
import { syncCancelRoute } from "./sync-cancel";
import { syncSourcesRoute } from "./sync-sources";
import { syncStartRoute } from "./sync-start";
import { syncStatusRoute } from "./sync-status";
import { syncWorkRoute } from "./sync-work";
import { unmatchedRetryRoute } from "./unmatched-retry";

const router = new Hono<AppEnv>()
  .route("/", syncStatusRoute)
  .route("/", syncSourcesRoute)
  .route("/", syncStartRoute)
  .route("/", syncWorkRoute)
  .route("/", syncCancelRoute)
  .route("/", cardsListRoute)
  .route("/", cardsSyncRoute)
  .route("/", cardsRevectorizeRoute)
  .route("/", cardsGamesRoute)
  .route("/", cardsDumpRoute)
  .route("/", rollbarTestRoute)
  .route("/", scanMetricsRoute)
  .route("/", scanVectorizeStatsRoute)
  .route("/", activeScanningRoute)
  .route("/", plansRoute)
  .route("/", platformStatsRoute)
  .route("/", discordChannelsRoute)
  .route("/", deletedItemsRoute)
  .route("/", unmatchedRetryRoute);

export { router as adminRouter };
