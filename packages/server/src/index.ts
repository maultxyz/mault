import "./lib/console-timestamps";

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { piCameraRouter } from "./routes/pi-camera";
import { piUpdateRouter } from "./routes/pi-update";
import { createPiSerialRouter, createPiSorterRouter } from "./routes/pi-serial";
import { PI_SERIAL_PATH, PI_SORTER_PATH } from "./lib/constants/pi-serial";
import {
  API_PORT,
  getApiHost,
  PUBLIC_REQUEST_BODY_MAX_BYTES,
  REQUEST_BODY_MAX_BYTES,
} from "./lib/constants/server";
import { PI_SCAN_SESSION_PATH, piScanRouter } from "./routes/pi-scan";
import { Hono } from "hono";
import {
  PLAN_PREVIEW_HEADER,
  PUBLIC_API_KEY_HEADER,
  SHARE_LINK_GUEST_KEY_HEADER,
  SYNC_API_PATH,
} from "@magic-vault/shared";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { getWebUrl } from "./lib/constants/urls";
import type { AppEnv } from "./middleware/auth";
import {
  compressResponses,
  shouldCompressResponses,
} from "./middleware/compression";
import { adminRouter } from "./routes/admin";
import { announcementsRouter } from "./routes/announcements";
import { apiKeysRouter } from "./routes/api-keys";
import { syncApiRouter } from "./routes/sync-api";
import { billingRouter } from "./routes/billing";
import { businessRouter } from "./routes/business";
import { cardHoldsRouter } from "./routes/card-holds";
import { tradeOffersRouter } from "./routes/trade-offers";
import { shareLinksRouter } from "./routes/share-links";
import { importTemplatesRouter } from "./routes/import-templates";
import { sortBinsRouter } from "./routes/bins";
import { presetWorkflowsRouter } from "./routes/preset-workflows";
import { botRouter } from "./routes/bot";
import { cardRouter } from "./routes/card";
import { collectionsRouter } from "./routes/collections";
import { overviewRouter } from "./routes/overview";
import { statsRouter } from "./routes/stats";
import { leaderboardRouter } from "./routes/leaderboard";
import { matchValidationsRouter } from "./routes/match-validations";
import { devicesRouter } from "./routes/devices";
import { gamesRouter } from "./routes/games";
import { impersonationRouter } from "./routes/impersonation";
import { localAuthRouter } from "./routes/local-auth";
import { meRouter } from "./routes/me";
import { notificationsRouter } from "./routes/notifications";
import { orgSettingsRouter } from "./routes/org-settings";
import { publicRouter } from "./routes/public";
import { integrationsRouter } from "./routes/integrations";
import { soundsRouter } from "./routes/sounds";
import { createSorterLinkRouter } from "./routes/sorter-link";
import { storageLocationsRouter } from "./routes/storage-locations";
import { streamRoute } from "./routes/stream";
import { publicApiRouter } from "./routes/v1";
import { webhooksRouter } from "./routes/webhooks";
import { reportServerError } from "./lib/error-reporting";
import {
  PUBLIC_API_EXPOSED_HEADERS,
  PUBLIC_API_PATH_PREFIX,
} from "./lib/constants/api-keys";
import { loadPlanConfig } from "./lib/plan-config";
import { startWebhookDeliveryWorker } from "./lib/webhooks/queue";
import { startDeviceOfflineAlerts } from "./lib/device-alerts";
import { startInventorySnapshots } from "./lib/inventory";
import { startApiUsageFlushing } from "./lib/api-usage";
import { startCardMatchIndexWarmup } from "./lib/card-match-index";
import { startShortLinkStartupSync } from "./lib/short-links";

const app = new Hono<AppEnv>();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const appCors = cors({
  origin: getWebUrl(),
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "X-Org-Id",
    PLAN_PREVIEW_HEADER,
    SHARE_LINK_GUEST_KEY_HEADER,
  ],
});
const publicApiCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "DELETE"],
  allowHeaders: ["Content-Type", PUBLIC_API_KEY_HEADER],
  exposeHeaders: PUBLIC_API_EXPOSED_HEADERS,
});

app.use((c, next) =>
  c.req.path.startsWith(PUBLIC_API_PATH_PREFIX)
    ? publicApiCors(c, next)
    : appCors(c, next),
);

const payloadTooLarge = bodyLimit({
  maxSize: REQUEST_BODY_MAX_BYTES,
  onError: (c) => c.json({ success: false, message: "Payload too large." }, 413),
});
const publicPayloadTooLarge = bodyLimit({
  maxSize: PUBLIC_REQUEST_BODY_MAX_BYTES,
  onError: (c) => c.json({ success: false, message: "Payload too large." }, 413),
});
app.use((c, next) =>
  c.req.path.startsWith("/public/")
    ? publicPayloadTooLarge(c, next)
    : payloadTooLarge(c, next),
);

if (shouldCompressResponses()) app.use(compressResponses);

if (process.env.AUTH_PROVIDER === "local") {
  app.route("/local-auth", localAuthRouter);
}

app.route("/bot", botRouter);
app.route("/me", meRouter);
app.route("/cards", cardRouter);
app.route("/bins", sortBinsRouter);
app.route("/preset-workflows", presetWorkflowsRouter);
app.route("/collections", collectionsRouter);
app.route("/overview", overviewRouter);
app.route("/stats", statsRouter);
app.route("/leaderboard", leaderboardRouter);
app.route("/match-validations", matchValidationsRouter);
app.route("/devices", devicesRouter);
app.route("/games", gamesRouter);
app.route("/announcements", announcementsRouter);
app.route("/notifications", notificationsRouter);
app.route("/org-settings", orgSettingsRouter);
app.route("/sounds", soundsRouter);
app.route("/storage-locations", storageLocationsRouter);
app.route("/integrations", integrationsRouter);
app.route("/api-keys", apiKeysRouter);
app.route("/webhooks", webhooksRouter);
app.route("/billing", billingRouter);
app.route("/business", businessRouter);
app.route("/card-holds", cardHoldsRouter);
app.route("/trade-offers", tradeOffersRouter);
app.route("/share-links", shareLinksRouter);
app.route("/import-templates", importTemplatesRouter);
app.route("/admin", adminRouter);
app.route("/admin", impersonationRouter);
app.route("/public", publicRouter);
app.route("/pi-camera", piCameraRouter);
app.route("/pi-update", piUpdateRouter);
app.route(PI_SCAN_SESSION_PATH, piScanRouter);
app.route(PI_SERIAL_PATH, createPiSerialRouter(upgradeWebSocket));
app.route(PI_SORTER_PATH, createPiSorterRouter(upgradeWebSocket));
app.route("/stream", streamRoute);
app.route("/sorter-link", createSorterLinkRouter(upgradeWebSocket));
app.route("/v1", publicApiRouter);
app.route(SYNC_API_PATH, syncApiRouter);

app.onError((err, c) => {
  console.error("[server] Unhandled error:", err);
  reportServerError(
    err,
    { url: c.req.url, method: c.req.method },
    c.get("userId"),
  );
  return c.json({ success: false, message: "Internal server error." }, 500);
});

loadPlanConfig();
startWebhookDeliveryWorker();
startDeviceOfflineAlerts();
startInventorySnapshots();
startApiUsageFlushing();
startCardMatchIndexWarmup();
startShortLinkStartupSync();

const server = serve(
  { fetch: app.fetch, port: API_PORT, hostname: getApiHost() },
  () => {
    console.log(`[server] Running on ${getApiHost()}:${API_PORT}`);
  },
);
injectWebSocket(server);
