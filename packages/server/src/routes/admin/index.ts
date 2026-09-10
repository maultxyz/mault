import { Hono } from "hono";
import type { AppEnv } from "../../middleware/auth";
import { cardsDumpRoute } from "./cards-dump";
import { cardsGamesRoute } from "./cards-games";
import { cardsListRoute } from "./cards-list";
import { cardsRevectorizeRoute } from "./cards-revectorize";
import { cardsSyncRoute } from "./cards-sync";
import { rollbarTestRoute } from "./rollbar-test";
import { syncCancelRoute } from "./sync-cancel";
import { syncSourcesRoute } from "./sync-sources";
import { syncStartRoute } from "./sync-start";
import { syncStatusRoute } from "./sync-status";
import { syncStreamRoute } from "./sync-stream";

const router = new Hono<AppEnv>()
  .route("/", syncStreamRoute)
  .route("/", syncStatusRoute)
  .route("/", syncSourcesRoute)
  .route("/", syncStartRoute)
  .route("/", syncCancelRoute)
  .route("/", cardsListRoute)
  .route("/", cardsSyncRoute)
  .route("/", cardsRevectorizeRoute)
  .route("/", cardsGamesRoute)
  .route("/", cardsDumpRoute)
  .route("/", rollbarTestRoute);

export { router as adminRouter };
