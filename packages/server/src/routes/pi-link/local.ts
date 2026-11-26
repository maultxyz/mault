import type { PiLinkLocalStatusResponse } from "@magic-vault/shared";
import { Hono } from "hono";
import { piLinkAppUrl, piLinkLocalStatus } from "../../lib/pi-link-device/client";
import { isPiHost } from "../../lib/pi-host";

export const piLinkLocalRouter = new Hono().get("/", (c) => {
  if (!isPiHost()) return c.notFound();
  const data: PiLinkLocalStatusResponse = { ...piLinkLocalStatus(), appUrl: piLinkAppUrl() };
  return c.json({ success: true, data });
});
