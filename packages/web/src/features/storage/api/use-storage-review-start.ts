import { useReviewLayout } from "@/features/cards/api/use-card-view-preferences";
import { fetchNextUnreviewedStorageCard } from "@/features/storage/api/storage-locations";
import { CARD_REVIEW_GRID_PARAM_VALUE } from "@/lib/constants/cards";
import { writeStorageSelectionSearchParams } from "@/features/storage/lib/storage-search-params";
import { toast } from "@/lib/toast";
import type { StorageLocation } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function useStorageReviewStart(
  selected: StorageLocation | undefined,
  openCard: (guid: string, scanId: string, review: boolean) => void,
) {
  const { t } = useTranslation("storage");
  const [, setSearchParams] = useSearchParams();
  const [reviewLayout, setReviewLayout] = useReviewLayout();

  const openReviewGrid = () => {
    if (!selected) return;
    setReviewLayout("grid");
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        writeStorageSelectionSearchParams(next, {
          locationGuid: selected.guid,
          shownLocationGuid: selected.guid,
          reviewParamValue: CARD_REVIEW_GRID_PARAM_VALUE,
        });
        return next;
      },
      { replace: true },
    );
  };

  const startReview = async () => {
    if (!selected) return;
    if (reviewLayout === "grid") {
      openReviewGrid();
      return;
    }
    const first = await fetchNextUnreviewedStorageCard(selected.guid).catch(
      () => null,
    );
    if (first) openCard(selected.guid, first, true);
    else toast.info(t("review.nothingLeft"));
  };

  return { reviewLayout, setReviewLayout, openReviewGrid, startReview };
}
