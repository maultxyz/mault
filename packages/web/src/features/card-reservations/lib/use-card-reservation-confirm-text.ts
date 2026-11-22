import type {
  CardReservationConfirmation,
  CardReservationConfirmText,
} from "@/lib/interfaces/card-reservations";
import { formatPrice } from "@magic-vault/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useCardReservationConfirmText() {
  const { t } = useTranslation("business");
  return useCallback(
    (confirmation: NonNullable<CardReservationConfirmation>): CardReservationConfirmText => {
      const { action, target } = confirmation;
      const { group } = target;
      if (target.kind === "reservation") {
        const { reservation } = target;
        const card = reservation.card.name;
        if (action === "collect") {
          return {
            title: t("reservations.collectConfirmTitle", { name: card }),
            description:
              reservation.price == null
                ? t("reservations.collectConfirmDescriptionNoPrice")
                : t("reservations.collectConfirmDescription", {
                    price: formatPrice(reservation.price, reservation.priceSource),
                  }),
            confirmLabel: t("reservations.pickedUp"),
            success: t("reservations.collected", { name: card }),
          };
        }
        return {
          title: t("reservations.releaseCardConfirmTitle", { card, name: group.guestName }),
          description: t("reservations.releaseConfirmDescription"),
          confirmLabel: t("reservations.release"),
          success: t("reservations.releasedCard", { card, name: group.guestName }),
        };
      }
      if (action === "collect") {
        const priceSource = group.reservations[0]?.priceSource;
        const total = priceSource ? formatPrice(group.heldPriceTotal, priceSource) : "";
        return {
          title: t("reservations.collectGroupConfirmTitle", {
            count: group.heldCount,
            name: group.guestName,
          }),
          description: [
            group.hasMissingHeldPrices
              ? t("reservations.collectGroupConfirmDescriptionMissingPrices", {
                  count: group.heldCount,
                  total,
                })
              : t("reservations.collectGroupConfirmDescription", {
                  count: group.heldCount,
                  total,
                }),
            group.waitingCount > 0
              ? t("reservations.collectGroupWaitingNote", { count: group.waitingCount })
              : null,
          ]
            .filter(Boolean)
            .join(" "),
          confirmLabel: t("reservations.pickedUpGroup", { count: group.heldCount }),
          success: t("reservations.collectedGroup", {
            count: group.heldCount,
            name: group.guestName,
          }),
        };
      }
      const activeCount = group.heldCount + group.waitingCount;
      return {
        title: t("reservations.releaseGroupConfirmTitle", {
          count: activeCount,
          name: group.guestName,
        }),
        description: t("reservations.releaseGroupConfirmDescription", { count: activeCount }),
        confirmLabel: t("reservations.releaseGroup", { count: activeCount }),
        success: t("reservations.releasedGroup", { count: activeCount, name: group.guestName }),
      };
    },
    [t],
  );
}
