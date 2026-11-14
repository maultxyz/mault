import type { BinRoute } from "./interfaces/bin-routes.interface";
import type {
  FeedNextCardAfterRoutedCardOptions,
  FeedNextCardAfterRoutedCardOutcome,
} from "./interfaces/module-one-clearance.interface";
import type { SerialReply } from "./interfaces/serial-session.interface";
import { feedWithRetries } from "./serial-protocol";

export function routeAllowsPipelinedFeed(route: Pick<BinRoute, "module">) {
  return route.module > 1;
}

export function isModuleOneStillLoaded(readIrReply: SerialReply | null) {
  return (
    !!readIrReply &&
    !readIrReply.error &&
    Array.isArray(readIrReply.ir) &&
    readIrReply.ir[0] === true
  );
}

export async function feedNextCardAfterRoutedCard<TFeedResult>({
  readSensors,
  feedOnce,
  replyOf,
  retryCount,
}: FeedNextCardAfterRoutedCardOptions<TFeedResult>): Promise<
  FeedNextCardAfterRoutedCardOutcome<TFeedResult>
> {
  const sensors = await readSensors().catch(() => null);
  if (isModuleOneStillLoaded(sensors)) return { kind: "stuckInModuleOne" };
  return {
    kind: "fed",
    result: await feedWithRetries(feedOnce, replyOf, retryCount),
  };
}
