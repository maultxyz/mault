import { Hono } from "hono";
import { piLinkLocalStatus } from "../../lib/pi-link-device/client";
import { isPiHost } from "../../lib/pi-host";

export const piLinkLocalRouter = new Hono().get("/", (c) =>
  isPiHost() ? c.json({ success: true, data: piLinkLocalStatus() }) : c.notFound(),
);
