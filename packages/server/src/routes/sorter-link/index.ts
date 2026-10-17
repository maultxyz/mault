import type { NodeWebSocket } from "@hono/node-ws";
import {
  SORTER_LINK_CLOSE_IN_USE,
  SORTER_LINK_CLOSE_OFFLINE,
  SORTER_LINK_MAX_MESSAGE_BYTES,
} from "@magic-vault/shared";
import { Hono } from "hono";
import type {
  SorterLinkEnv,
  SorterLinkTarget,
} from "../../lib/interfaces/sorter-link";
import {
  attachClient,
  attachDevice,
  detachClient,
  detachDevice,
  relayToClient,
  relayToDevice,
} from "../../lib/sorter-link";
import { requireSorterClient, requireSorterToken } from "./auth";

export function createSorterLinkRouter(
  upgradeWebSocket: NodeWebSocket["upgradeWebSocket"],
) {
  return new Hono<SorterLinkEnv>()
    .get(
      "/device",
      requireSorterToken,
      upgradeWebSocket((c) => {
        const target: SorterLinkTarget = c.get("sorterLink");
        return {
          onOpen: (_event, ws) => attachDevice(target, ws),
          onMessage: (event, ws) => {
            if (typeof event.data !== "string") return;
            relayToClient(target.deviceGuid, ws, event.data);
          },
          onClose: (_event, ws) => detachDevice(target.deviceGuid, ws),
        };
      }),
    )
    .get(
      "/client",
      requireSorterClient,
      upgradeWebSocket((c) => {
        const target: SorterLinkTarget = c.get("sorterLink");
        return {
          onOpen: (_event, ws) => {
            const result = attachClient(target.orgId, target.deviceGuid, ws);
            if (result === "offline") {
              ws.close(SORTER_LINK_CLOSE_OFFLINE, "Sorter offline");
            } else if (result === "in_use") {
              ws.close(SORTER_LINK_CLOSE_IN_USE, "Sorter in use");
            }
          },
          onMessage: (event, ws) => {
            if (
              typeof event.data !== "string" ||
              event.data.length > SORTER_LINK_MAX_MESSAGE_BYTES
            ) {
              return;
            }
            relayToDevice(target.deviceGuid, ws, event.data);
          },
          onClose: (_event, ws) => detachClient(target.deviceGuid, ws),
        };
      }),
    );
}
