import {
  requestSorterRoute,
  isFirmwareFeatureSupported,
  type BinRoute,
} from "@magic-vault/shared";
import {
  PI_SCAN_FEED_TIMEOUT_MS,
  PI_SCAN_ROUTE_TIMEOUT_MS,
  PI_SCAN_STATUS_TIMEOUT_MS,
} from "../constants/pi-scan";
import type { SorterLink } from "./sorter-link";
import type { PiScanPipelineOptions } from "../interfaces/pi-scan";
import { PI_CONTROLLER_COMMAND_TIMEOUT_MS } from "../constants/pi-controller";
import { isPiSorter } from "../pi-host";

export async function routeLoadedPiCard(
  link: SorterLink,
  route: BinRoute,
  pipeline?: PiScanPipelineOptions,
): Promise<void> {
  const feedNext =
    !!pipeline?.enabled() &&
    isFirmwareFeatureSupported(link.firmwareVersion, "pipelinedFeed");
  let receivedFeed = false;
  const unsubscribe = feedNext
    ? link.onFed((feed) => {
        receivedFeed = true;
        pipeline!.onFed(feed);
      })
    : () => {};
  const timeout =
    PI_SCAN_ROUTE_TIMEOUT_MS + (feedNext ? PI_SCAN_FEED_TIMEOUT_MS : 0);
  const commandTimeout = isPiSorter()
    ? Math.min(
        timeout,
        PI_CONTROLLER_COMMAND_TIMEOUT_MS - PI_SCAN_STATUS_TIMEOUT_MS,
      )
    : timeout;
  let reply: Record<string, unknown>;
  try {
    const result = await requestSorterRoute(
      (command, timeout) => link.command(command, timeout),
      route,
      { feedNext, requireLoadedCard: true },
      commandTimeout,
      PI_SCAN_STATUS_TIMEOUT_MS,
    );
    if (result?.noLoadedCard) throw new Error("No card detected at module 1.");
    if (!result) throw new Error("The sorter did not confirm routing.");
    reply = result;
  } finally {
    unsubscribe();
  }
  if (reply.error || reply.skipped === true || reply.status !== "routed") {
    throw new Error(
      typeof reply.error === "string"
        ? reply.error
        : "The sorter did not confirm routing.",
    );
  }
  if (reply.fedNext === true && !receivedFeed) {
    throw new Error("The sorter did not report the next feed result.");
  }
}
