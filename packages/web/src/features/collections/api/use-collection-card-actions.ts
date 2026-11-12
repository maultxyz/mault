import {
  setCollectionCardTags,
  confirmCollectionCard,
  markCollectionCardReviewed,
  setCollectionCardCondition,
  setCollectionCardLanguage,
  setCollectionCardStamp,
  setCollectionCardFoilType,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import {
  invalidateCollectionCards,
  updateInCardPages,
} from "@/features/collections/lib/card-page-cache";
import type { CardDetailActions } from "@/lib/interfaces/cards";
import {
  withCardTags,
  type GroupedScannedCard,
  type Result,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export function useCollectionCardActions(
  guid: string | undefined,
): CardDetailActions {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const apply = (
      scanId: string,
      update: (item: GroupedScannedCard) => GroupedScannedCard,
      request: (guid: string) => Promise<Result<unknown>>,
      label: string,
    ) => {
      if (!guid) return;
      updateInCardPages(queryClient, guid, new Set([scanId]), update);
      request(guid)
        .catch((err) => console.error(`Failed to ${label}:`, err))
        .finally(() => void invalidateCollectionCards(queryClient, guid));
    };

    return {
      correctCard: (scanId, card) => {
        const corrected = { ...card, distance: 0, confidence: 1 };
        apply(
          scanId,
          (item) => ({
            ...item,
            card: corrected,
            corrected: true,
            reviewed: true,
            lowConfidenceMatch: false,
          }),
          (guid) => updateCollectionCard(guid, scanId, corrected),
          "correct card",
        );
      },
      confirmCard: (scanId) =>
        apply(
          scanId,
          (item) => ({
            ...item,
            corrected: true,
            reviewed: true,
            lowConfidenceMatch: false,
          }),
          (guid) => confirmCollectionCard(guid, scanId),
          "confirm card",
        ),
      markCardReviewed: (scanId) =>
        apply(
          scanId,
          (item) => ({ ...item, reviewed: true, lowConfidenceMatch: false }),
          (guid) => markCollectionCardReviewed(guid, scanId),
          "mark card reviewed",
        ),
      setCardFoilType: (scanId, foilType) =>
        apply(
          scanId,
          (item) => ({
            ...item,
            isFoil: foilType != null,
            foilType: foilType ?? undefined,
          }),
          (guid) =>
            setCollectionCardFoilType(guid, scanId, foilType != null, foilType),
          "update foil status",
        ),
      setCardStamp: (scanId, stamp) =>
        apply(
          scanId,
          (item) => ({ ...item, stamp: stamp ?? undefined }),
          (guid) => setCollectionCardStamp(guid, scanId, stamp),
          "update card stamp",
        ),
      setCardCondition: (scanId, condition) =>
        apply(
          scanId,
          (item) => ({ ...item, condition }),
          (guid) => setCollectionCardCondition(guid, scanId, condition),
          "update card condition",
        ),
      setCardLanguage: (scanId, language) =>
        apply(
          scanId,
          (item) => ({ ...item, language }),
          (guid) => setCollectionCardLanguage(guid, scanId, language),
          "update card language",
        ),
      setCardTags: (scanId, tags, enabled) =>
        apply(
          scanId,
          (item) => withCardTags(item, tags, enabled),
          (guid) =>
            setCollectionCardTags(guid, { scanIds: [scanId], tags, enabled }),
          "update card tags",
        ),
    };
  }, [guid, queryClient]);
}
