import { computeBinCount, type BinRoute } from "./interfaces/bin-routes.interface";
import type {
  FeederTestResult,
  FeederTestRunOptions,
} from "./interfaces/feeder-test.interface";
import { feedWithRetries, isFailedRouteResponse } from "./serial-protocol";

export function feederTestBottomBinRoute(moduleCount: number): BinRoute {
  return {
    binNumber: computeBinCount(moduleCount),
    module: moduleCount,
    direction: "bottom",
  };
}

function replyError(reply: unknown): string | null {
  if (!reply || typeof reply !== "object") return null;
  const error = (reply as Record<string, unknown>).error;
  return typeof error === "string" ? error : null;
}

export async function runFeederTest({
  cardsToSend,
  currentFeedRetryCount,
  prepareNextCard,
  feedOnce,
  routeCardToBottomBin,
  isStopRequested,
  onCardSent,
}: FeederTestRunOptions): Promise<FeederTestResult> {
  let cardsSent = 0;
  while (cardsToSend === null || cardsSent < cardsToSend) {
    if (isStopRequested()) return { outcome: "stopped", cardsSent, error: null };
    await prepareNextCard?.();
    const feedReply = await feedWithRetries(feedOnce, (reply) => reply, currentFeedRetryCount());
    if (feedReply?.empty === true) {
      return { outcome: "hopperEmpty", cardsSent, error: null };
    }
    if (!feedReply || "error" in feedReply || feedReply.detected === false) {
      return { outcome: "feedFailed", cardsSent, error: replyError(feedReply) };
    }
    const routeReply = await routeCardToBottomBin();
    if (isFailedRouteResponse(routeReply)) {
      return { outcome: "routeFailed", cardsSent, error: replyError(routeReply) };
    }
    cardsSent += 1;
    onCardSent(cardsSent);
  }
  return { outcome: "completed", cardsSent, error: null };
}
