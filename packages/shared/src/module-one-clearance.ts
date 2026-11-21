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

export function isModuleOneLoadedFeedReply(feedReply: SerialReply | null) {
  return feedReply?.moduleOneLoaded === true;
}

export async function feedNextCardAfterRoutedCard<TFeedResult>({
  readSensors,
  feedOnce,
  feedOnceRequiringEmptyModuleOne,
  replyOf,
  retryCount,
}: FeedNextCardAfterRoutedCardOptions<TFeedResult>): Promise<
  FeedNextCardAfterRoutedCardOutcome<TFeedResult>
> {
  if (feedOnceRequiringEmptyModuleOne) {
    const firstFeed = await feedOnceRequiringEmptyModuleOne();
    if (isModuleOneLoadedFeedReply(replyOf(firstFeed)))
      return { kind: "stuckInModuleOne" };
    let isFirstFeed = true;
    return {
      kind: "fed",
      result: await feedWithRetries(
        () => {
          if (!isFirstFeed) return feedOnce();
          isFirstFeed = false;
          return Promise.resolve(firstFeed);
        },
        replyOf,
        retryCount,
      ),
    };
  }
  const sensors = await readSensors().catch(() => null);
  if (isModuleOneStillLoaded(sensors)) return { kind: "stuckInModuleOne" };
  return {
    kind: "fed",
    result: await feedWithRetries(feedOnce, replyOf, retryCount),
  };
}
