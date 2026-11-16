import { useReviewQueueCards } from "@/features/cards/api/use-review-queue";
import { ReviewQueueList } from "@/features/cards/components/review-queue-panel";
import { cardGridPathKeepingSearchParams } from "@/lib/card-search-params";
import type { ReviewQueuePanelProps } from "@/lib/interfaces/cards";
import { useNavigate, useSearchParams } from "react-router-dom";

export function ReviewQueuePanel({ session }: ReviewQueuePanelProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isPending, isError, refetch } = useReviewQueueCards(session);

  return (
    <ReviewQueueList
      cards={data?.cards ?? []}
      totalCards={data?.totalCards ?? 0}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      currentScanId={session.currentScanId}
      reviewedScanIds={session.reviewedScanIds}
      removedScanIds={session.removedScanIds}
      onOpen={(scanId) =>
        navigate(
          cardGridPathKeepingSearchParams(
            `/app/cards/${scanId}`,
            searchParams,
            "1",
          ),
          { replace: true },
        )
      }
      onExit={() =>
        navigate(cardGridPathKeepingSearchParams("/app", searchParams, null), {
          replace: true,
        })
      }
    />
  );
}
