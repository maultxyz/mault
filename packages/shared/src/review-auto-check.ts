import {
  REVIEW_AUTO_CHECK_MAX_PAGES_SCANNED,
  REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS,
} from "./constants/review-auto-check.constant";
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
  ReviewAutoCheckRunResult,
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
  sentScanIds,
  loadMoreCards,
  checkCollectionCards,
  onBatchStart,
  onOutcomes,
  isCancelled = () => false,
}: ReviewAutoCheckRunOptions): Promise<ReviewAutoCheckRunResult> {
  for (;;) {
    if (isCancelled()) return "cancelled";
    const unsent = cards().filter((card) => !sentScanIds.has(card.scanId));
    if (unsent.length === 0) {
      if (!loadMoreCards || (await loadMoreCards()) === 0) return "finished";
      continue;
    }
    const collectionGuid = unsent[0].collectionGuid;
    const batch = unsent
      .filter((card) => card.collectionGuid === collectionGuid)
      .slice(0, REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS)
      .map((card) => card.scanId);
    for (const scanId of batch) sentScanIds.add(scanId);
    onBatchStart?.(batch);
    const result = await checkCollectionCards(collectionGuid, batch).catch(
      (error: unknown) => {
        for (const scanId of batch) sentScanIds.delete(scanId);
        throw error;
      },
    );
    onOutcomes(result.outcomes);
  }
}

export async function loadUnseenReviewCards<T extends { scanId: string }>(
  loadPage: (page: number) => Promise<T[]>,
  seenScanIds: ReadonlySet<string>,
): Promise<T[]> {
  for (let page = 0; page < REVIEW_AUTO_CHECK_MAX_PAGES_SCANNED; page++) {
    const pageCards = await loadPage(page);
    if (pageCards.length === 0) return [];
    const unseen = pageCards.filter((card) => !seenScanIds.has(card.scanId));
    if (unseen.length > 0) return unseen;
  }
  return [];
}
