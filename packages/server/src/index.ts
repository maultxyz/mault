import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./middleware/auth";
import { adminRouter } from "./routes/admin";
import { announcementsRouter } from "./routes/announcements";
import { billingRouter } from "./routes/billing";
import { binRoutesRouter } from "./routes/bin-routes";
import { sortBinsRouter } from "./routes/bins";
import { botRouter } from "./routes/bot";
import { cardRouter } from "./routes/card";
import { collectionsRouter } from "./routes/collections";
import { feederRouter } from "./routes/feeder";
import { gamesRouter } from "./routes/games";
import { impersonationRouter } from "./routes/impersonation";
import { localAuthRouter } from "./routes/local-auth";
import { moduleConfigsRouter } from "./routes/module-configs";
import { notificationsRouter } from "./routes/notifications";
import { orgSettingsRouter } from "./routes/org-settings";
import { publicRouter } from "./routes/public";

const app = new Hono<AppEnv>();
const PORT = parseInt(process.env.PORT ?? "3001");

app.use(
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id"],
  }),
);

if (process.env.AUTH_PROVIDER === "local") {
  app.route("/local-auth", localAuthRouter);
}

app.route("/bot", botRouter);
app.route("/cards", cardRouter);
app.route("/bins", sortBinsRouter);
app.route("/bin-routes", binRoutesRouter);
app.route("/collections", collectionsRouter);
app.route("/modules", moduleConfigsRouter);
app.route("/feeder", feederRouter);
app.route("/games", gamesRouter);
app.route("/announcements", announcementsRouter);
app.route("/notifications", notificationsRouter);
app.route("/org-settings", orgSettingsRouter);
app.route("/billing", billingRouter);
app.route("/admin", adminRouter);
app.route("/admin", impersonationRouter);
app.route("/public", publicRouter);

app.onError((err, c) => {
  console.error("[server] Unhandled error:", err);
  return c.json({ success: false, message: "Internal server error." }, 500);
});

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, () => {
  console.log(`[server] Running on port:${PORT}`);
});
