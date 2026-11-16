import { compress } from "hono/compress";
import { createMiddleware } from "hono/factory";
import { isPiHost } from "../lib/pi-host";
import type { AppEnv } from "./auth";

const compressCompressibleResponses = compress();

export const compressResponses = createMiddleware<AppEnv>(async (c, next) => {
  let routeEncodedResponse = false;
  await compressCompressibleResponses(c, async () => {
    await next();
    routeEncodedResponse = c.res.headers.has("Content-Encoding");
  });
  if (!routeEncodedResponse && c.res.headers.has("Content-Encoding")) {
    c.res.headers.append("Vary", "Accept-Encoding");
  }
});

export function shouldCompressResponses(): boolean {
  return !isPiHost();
}
