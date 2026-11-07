import { useReviewQueueCards } from "@/features/cards/api/use-review-queue";
import { ReviewQueueList } from "@/features/cards/components/review-queue-panel";
import { CARD_REVIEW_SEARCH_PARAM } from "@/lib/constants/cards";
import type { ReviewQueuePanelProps } from "@/lib/interfaces/cards";
import { useNavigate } from "react-router-dom";

export function ReviewQueuePanel({ session }: ReviewQueuePanelProps) {
  const navigate = useNavigate();
  const { data, isPending, isError } = useReviewQueueCards(session);

  return (
    <ReviewQueueList
      cards={data?.cards ?? []}
      totalCards={data?.totalCards ?? 0}
      isPending={isPending}
      isError={isError}
      currentScanId={session.currentScanId}
      reviewedScanIds={session.reviewedScanIds}
      removedScanIds={session.removedScanIds}
      onOpen={(scanId) =>
        navigate(`/app/cards/${scanId}?${CARD_REVIEW_SEARCH_PARAM}=1`, {
          replace: true,
        })
      }
      onExit={() => navigate("/app", { replace: true })}
    />
  );
}
