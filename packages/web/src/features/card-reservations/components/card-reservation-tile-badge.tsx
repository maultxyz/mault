import { Badge } from "@/components/ui/badge";
import { useCardReservationTileLabel } from "@/features/card-reservations/lib/use-card-reservation-tile-label";
import type { CardReservationTileBadgeProps } from "@/lib/interfaces/card-reservations";

export function CardReservationTileBadge({ scanId }: CardReservationTileBadgeProps) {
  const tileLabel = useCardReservationTileLabel(scanId);
  if (!tileLabel) return null;
  return (
    <Badge variant={tileLabel.isMine ? "success" : "info"} className="shadow-md">
      {tileLabel.text}
    </Badge>
  );
}
