import {
  cancelCardReservation,
  publicCardReservationsKey,
  publicCardReservationsQueryOptions,
} from "@/features/card-reservations/api/public-card-reservations";
import {
  readReservationCart,
  saveReservationCart,
} from "@/features/card-reservations/lib/reservation-cart-storage";
import { CardReservationsContext } from "@/lib/card-reservations-context";
import type {
  CardReservationsContextValue,
  CardReservationsProviderProps,
} from "@/lib/interfaces/card-reservations";
import { toast } from "@/lib/toast";
import {
  CARD_RESERVATION_CARDS_PER_REQUEST_MAX,
  CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX,
  isActiveCardReservationStatus,
  type PublicCard,
  type PublicCardReservation,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function CardReservationsProvider({
  source,
  holdDays,
  onOpenComposer,
  children,
}: CardReservationsProviderProps) {
  const { t } = useTranslation("cards");
  const queryClient = useQueryClient();
  const { data } = useQuery(publicCardReservationsQueryOptions(source));
  const [cart, setCart] = useState<PublicCard[]>(() => readReservationCart(source));
  useEffect(() => saveReservationCart(source, cart), [source, cart]);
  const cancel = useMutation({
    mutationFn: (reservation: PublicCardReservation) =>
      cancelCardReservation(source, reservation.guid),
    onSuccess: () => toast.success(t("reservations.cancelled")),
    onError: (error) => toast.error(error.message || t("reservations.cancelFailed")),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: publicCardReservationsKey(source) }),
  });
  const cancellingReservationGuid = cancel.isPending ? (cancel.variables?.guid ?? null) : null;
  const cancelReservation = cancel.mutate;

  const value = useMemo<CardReservationsContextValue>(() => {
    const queueLengthByScanId = new Map(
      (data?.reservedCards ?? []).map((card) => [card.scanId, card.queueLength]),
    );
    const mine = data?.mine ?? [];
    const activeMine = mine.filter((reservation) =>
      isActiveCardReservationStatus(reservation.status),
    );
    const cartMax = Math.min(
      CARD_RESERVATION_CARDS_PER_REQUEST_MAX,
      Math.max(CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX - activeMine.length, 0),
    );
    return {
      holdDays,
      cart,
      isInCart: (scanId) => cart.some((entry) => entry.scanId === scanId),
      toggleInCart: (entry) => {
        const isAdding = !cart.some((item) => item.scanId === entry.scanId);
        if (isAdding && cart.length >= cartMax) {
          toast.warning(t("reservations.cartLimit", { max: CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX }));
          return;
        }
        setCart((current) =>
          current.some((item) => item.scanId === entry.scanId)
            ? current.filter((item) => item.scanId !== entry.scanId)
            : [...current, entry],
        );
      },
      removeFromCart: (scanId) =>
        setCart((current) => current.filter((entry) => entry.scanId !== scanId)),
      clearCart: () => setCart([]),
      openComposer: onOpenComposer,
      mine,
      activeMineCount: activeMine.length,
      queueLengthOf: (scanId) => queueLengthByScanId.get(scanId) ?? 0,
      myReservationFor: (scanId) =>
        activeMine.find((reservation) => reservation.scanId === scanId) ?? null,
      cancelReservation,
      cancellingReservationGuid,
    };
  }, [data, holdDays, cart, onOpenComposer, cancelReservation, cancellingReservationGuid, t]);

  return <CardReservationsContext value={value}>{children}</CardReservationsContext>;
}
