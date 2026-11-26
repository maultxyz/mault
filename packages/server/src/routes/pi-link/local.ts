import type { PiLinkLocalStatusResponse } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import type { IncomingMessage } from "node:http";
import {
  PI_LINK_LOCAL_CLIENT_ADDRESS_HEADER,
  PI_LINK_LOCAL_FORBIDDEN_MESSAGE,
} from "../../lib/constants/pi-hosts";
import { piLinkAppUrl, piLinkLocalStatus } from "../../lib/pi-link-device/client";
import { isLocalNetworkAddress, isLoopbackAddress } from "../../lib/pi-link-device/local-network";
import { isPiHost } from "../../lib/pi-host";

function requestClientAddress(c: Context): string | undefined {
  const socketAddress = (c.env as { incoming?: IncomingMessage } | undefined)?.incoming?.socket
    .remoteAddress;
  if (socketAddress && !isLoopbackAddress(socketAddress)) return socketAddress;
  return c.req.header(PI_LINK_LOCAL_CLIENT_ADDRESS_HEADER) ?? socketAddress;
}

export const piLinkLocalRouter = new Hono().get("/", (c) => {
  if (!isPiHost()) return c.notFound();
  if (!isLocalNetworkAddress(requestClientAddress(c))) {
    return c.json({ success: false, message: PI_LINK_LOCAL_FORBIDDEN_MESSAGE }, 403);
  }
  const data: PiLinkLocalStatusResponse = { ...piLinkLocalStatus(), appUrl: piLinkAppUrl() };
  return c.json({ success: true, data });
});
