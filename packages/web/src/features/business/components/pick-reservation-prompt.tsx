import { ConfirmDialog } from "@/components/confirm-dialog";
import { reservationRequestsPath } from "@/lib/constants/business";
import type { PickReservationPromptProps } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function PickReservationPrompt({ requestGuids, onClose }: PickReservationPromptProps) {
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  const count = requestGuids.length;
  return (
    <ConfirmDialog
      open={count > 0}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("orders.reservationPrompt.title", { count })}
      description={t("orders.reservationPrompt.description", { count })}
      confirmLabel={t("orders.reservationPrompt.confirm", { count })}
      cancelLabel={t("orders.reservationPrompt.stay")}
      onConfirm={() => {
        onClose();
        navigate(reservationRequestsPath(requestGuids));
      }}
    />
  );
}
