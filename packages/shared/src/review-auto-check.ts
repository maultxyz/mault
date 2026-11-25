import { REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS } from "./constants/review-auto-check.constant";
import { needsTextSearch, pickUnmatchedRetryMatch } from "./scan-identify";
import type {
  CardSearchResult,
  CardTextSearchResult,
  SearchCardMatch,
} from "./interfaces/api.interface";
import type {
  ReviewAutoCheckCounts,
  ReviewAutoCheckDecision,
  ReviewAutoCheckOutcome,
  ReviewAutoCheckRunOptions,
  ReviewAutoCheckSavedCard,
} from "./interfaces/review-auto-check.interface";

function isSavedCard(
  saved: ReviewAutoCheckSavedCard,
  match: SearchCardMatch | undefined,
): boolean {
  if (!match || match.cardId !== saved.cardId) return false;
  const matchLang = match.lang ?? match.card?.lang ?? null;
  return !saved.lang || !matchLang || matchLang === saved.lang;
}

export function decideReviewAutoCheck(
  saved: ReviewAutoCheckSavedCard,
  imageResult: CardSearchResult,
  textResult: CardTextSearchResult | null,
): ReviewAutoCheckDecision {
  const pick = pickUnmatchedRetryMatch(imageResult, textResult);
  if (!pick) return { verdict: "unsure", suggestion: null };
  const leader = (pick === "text" ? textResult : imageResult)?.data?.[0];
  if (!leader) return { verdict: "unsure", suggestion: null };
  if (!isSavedCard(saved, leader)) {
    return { verdict: "different", suggestion: leader };
  }
  const textAgrees = isSavedCard(saved, textResult?.data?.[0]);
  const imageIsConfident =
    !needsTextSearch(imageResult) && isSavedCard(saved, imageResult.data?.[0]);
  return {
    verdict: textAgrees || imageIsConfident ? "confirmed" : "unsure",
    suggestion: null,
  };
}

export function countReviewAutoCheckVerdicts(
  outcomes: Iterable<ReviewAutoCheckOutcome>,
): ReviewAutoCheckCounts {
  const counts: ReviewAutoCheckCounts = { confirmed: 0, different: 0, unsure: 0 };
  for (const outcome of outcomes) counts[outcome.verdict]++;
  return counts;
}

export async function runReviewAutoCheck({
  cards,
  checkCollectionCards,
  onBatchStart,
  onOutcomes,
  isCancelled = () => false,
}: ReviewAutoCheckRunOptions): Promise<void> {
  const scanIdsByCollection = new Map<string, string[]>();
  for (const card of cards) {
    const scanIds = scanIdsByCollection.get(card.collectionGuid) ?? [];
    scanIds.push(card.scanId);
    scanIdsByCollection.set(card.collectionGuid, scanIds);
  }
  for (const [collectionGuid, scanIds] of scanIdsByCollection) {
    for (
      let start = 0;
      start < scanIds.length;
      start += REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS
    ) {
      if (isCancelled()) return;
      const batch = scanIds.slice(start, start + REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS);
      onBatchStart?.(batch);
      onOutcomes((await checkCollectionCards(collectionGuid, batch)).outcomes);
    }
  }
}
