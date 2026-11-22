import { CountDot } from "@/components/count-dot";
import { Button } from "@/components/ui/button";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import type { CardReservationsHeaderButtonProps } from "@/lib/interfaces/card-reservations";
import { IconBookmark } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardReservationsHeaderButton({
  isIconOnly = false,
}: CardReservationsHeaderButtonProps) {
  const { t } = useTranslation("cards");
  const reservations = useCardReservationsContext();
  if (!reservations) return null;
  const count = reservations.cart.length;
  const label = t("reservations.headerButton", { count });
  return (
    <Button
      variant={count > 0 ? "selected" : "outline"}
      size={isIconOnly ? "icon" : "default"}
      className={isIconOnly ? "relative shrink-0" : undefined}
      aria-label={isIconOnly ? label : undefined}
      onClick={reservations.openComposer}
    >
      <IconBookmark />
      {isIconOnly ? <CountDot count={count} /> : label}
    </Button>
  );
}
