import { Hono } from "hono";
import pkg from "../../../package.json";
import type { AppEnv } from "../../middleware/auth";

export const versionRoute = new Hono<AppEnv>().get("/version", (c) => {
  return c.json({ success: true, data: { version: pkg.version } });
});
