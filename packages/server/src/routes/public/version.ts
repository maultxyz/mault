import { Hono } from "hono";
import pkg from "../../../package.json";
import { isPiHost } from "../../lib/pi-host";
import type { AppEnv } from "../../middleware/auth";

export const versionRoute = new Hono<AppEnv>().get("/version", (c) => {
  return c.json({
    success: true,
    data: { version: pkg.version, piHost: isPiHost() },
  });
});
