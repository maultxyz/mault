import { Button } from "@/components/ui/button";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import type { CardReservationQuickToggleProps } from "@/lib/interfaces/card-reservations";
import { cn } from "@/lib/utils";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardReservationQuickToggle({ entry }: CardReservationQuickToggleProps) {
  const { t } = useTranslation("cards");
  const reservations = useCardReservationsContext();
  if (!reservations || reservations.myReservationFor(entry.scanId)) return null;
  const isInCart = reservations.isInCart(entry.scanId);
  return (
    <Button
      type="button"
      size="icon"
      variant={isInCart ? "default" : "outline"}
      className={cn("absolute top-2.5 right-2.5 z-30 shadow-popover", !isInCart && "dark:bg-card")}
      aria-pressed={isInCart}
      aria-label={t(isInCart ? "reservations.quickRemove" : "reservations.quickAdd", {
        name: entry.card.name,
      })}
      onClick={() => reservations.toggleInCart(entry)}
    >
      {isInCart ? <IconCheck /> : <IconPlus />}
    </Button>
  );
}
