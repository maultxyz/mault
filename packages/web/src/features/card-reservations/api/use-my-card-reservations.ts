import {
  cancelMyCardReservations,
  markMyCardReservationAlertsSeen,
  myCardReservationsQueryKey,
  myCardReservationsQueryOptions,
} from "@/features/card-reservations/api/my-card-reservations";
import { guestCancelKey } from "@/features/card-reservations/lib/guest-cancel-key";
import { useAuthSession } from "@/lib/auth";
import type { GuestCardReservationCancelTarget } from "@/lib/interfaces/card-reservations";
import { toast } from "@/lib/toast";
import type { MyCardReservation } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useMyCardReservations() {
  const { data } = useAuthSession();
  return useQuery(myCardReservationsQueryOptions(data?.user?.id));
}

export function useMyCardReservationAlerts(): MyCardReservation[] {
  const { data } = useMyCardReservations();
  return (data ?? []).filter((reservation) => reservation.guestAlert !== null);
}

export function useMyCardReservationActions() {
  const { t } = useTranslation("common");
  const { data: session } = useAuthSession();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: myCardReservationsQueryKey(session?.user?.id) });
  const cancel = useMutation({
    mutationFn: async (target: GuestCardReservationCancelTarget) => {
      const result = await cancelMyCardReservations(target);
      if (!result.success) throw new Error(result.message);
    },
    onSuccess: () => toast.success(t("myReservations.cancelled")),
    onError: (error) => toast.error(error.message || t("myReservations.cancelFailed")),
    onSettled: refresh,
  });
  const markSeen = useMutation({
    mutationFn: (guids: string[]) => markMyCardReservationAlertsSeen(guids),
    onSettled: refresh,
  });
  const isCancelling = (target: GuestCardReservationCancelTarget) =>
    cancel.isPending &&
    !!cancel.variables &&
    guestCancelKey(cancel.variables) === guestCancelKey(target);
  return { cancel, markSeen, isCancelling };
}
