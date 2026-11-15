import {
  feedNextCardAfterRoutedCard,
  feedWithRetries,
  type FeedNextCardAfterRoutedCardOutcome,
  type SerialReply,
} from "@magic-vault/shared";
import { PI_SCAN_STATUS_TIMEOUT_MS } from "../constants/pi-scan";
import type { SorterLink } from "./sorter-link";

export async function feedNextPiScanCard(
  link: Pick<SorterLink, "command">,
  {
    confirmRoutedCardLeftModuleOne,
    feedOnce,
    retryCount,
  }: {
    confirmRoutedCardLeftModuleOne: boolean;
    feedOnce: () => Promise<SerialReply>;
    retryCount: number;
  },
): Promise<FeedNextCardAfterRoutedCardOutcome<SerialReply>> {
  if (!confirmRoutedCardLeftModuleOne) {
    return {
      kind: "fed",
      result: await feedWithRetries(feedOnce, (reply) => reply, retryCount),
    };
  }
  return feedNextCardAfterRoutedCard({
    readSensors: () =>
      link.command({ readIR: true }, PI_SCAN_STATUS_TIMEOUT_MS),
    feedOnce,
    replyOf: (reply) => reply,
    retryCount,
  });
}
