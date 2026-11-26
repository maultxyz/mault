import { serve } from "@hono/node-server";
import { PI_LINK_LOCAL_STATUS_PATH } from "@magic-vault/shared";
import { Hono } from "hono";
import { API_PORT, getApiHost } from "./lib/constants/server";
import { PI_LINK_DEVICE_URL_ENV } from "./lib/constants/pi-hosts";
import { piLinkBaseUrl, startPiLinkDevice } from "./lib/pi-link-device/client";
import { isPiHost } from "./lib/pi-host";
import { serverVersionInfo } from "./lib/server-version";
import { piLinkLocalRouter } from "./routes/pi-link/local";

if (!isPiHost() || !piLinkBaseUrl()) {
  console.error(`[pi-link] The linked Pi runtime needs PI_HOST=1 and ${PI_LINK_DEVICE_URL_ENV}.`);
  process.exit(1);
}

const app = new Hono()
  .get("/public/version", (c) =>
    c.json({ success: true, data: { ...serverVersionInfo(false), piLinked: true } }),
  )
  .route(PI_LINK_LOCAL_STATUS_PATH, piLinkLocalRouter)
  .notFound((c) => c.json({ success: false, message: "Not found." }, 404))
  .onError((error, c) => {
    console.error("[pi-link] Unhandled error:", error);
    return c.json({ success: false, message: "Internal server error." }, 500);
  });

startPiLinkDevice();

serve({ fetch: app.fetch, port: API_PORT, hostname: getApiHost() }, () => {
  console.log(`[pi-link] Linked Pi runtime on ${getApiHost()}:${API_PORT}`);
});
