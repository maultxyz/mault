import { Button } from "@/components/ui/button";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import { IconBookmark } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ReservationReviewBar() {
  const { t } = useTranslation("cards");
  const reservations = useCardReservationsContext();
  const count = reservations?.cart.length ?? 0;
  if (!reservations || count === 0) return null;
  return (
    <div className="shrink-0 border-t bg-background p-2">
      <Button size="lg" className="w-full" onClick={reservations.openComposer}>
        <IconBookmark />
        {t("reservations.reviewBar", { count })}
      </Button>
    </div>
  );
}
