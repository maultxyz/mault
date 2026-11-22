import {
  cardReservationGroupStageCounts,
  type CardReservationRequestGroup,
} from "@magic-vault/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useCardReservationGroupSummary() {
  const { t } = useTranslation("business");
  return useCallback(
    (group: CardReservationRequestGroup): string => {
      const cards = t("reservations.cardCount", { count: group.reservations.length });
      const stages = cardReservationGroupStageCounts(group)
        .map(({ stage, count }) => t(`reservations.stageCounts.${stage}`, { count }))
        .join(", ");
      return stages ? t("reservations.groupSummary", { cards, stages }) : cards;
    },
    [t],
  );
}
