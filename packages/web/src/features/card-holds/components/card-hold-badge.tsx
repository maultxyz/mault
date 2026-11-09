import { Badge } from "@/components/ui/badge";
import { useCardHoldsContext } from "@/lib/card-holds-context";
import type { CardHoldBadgeProps } from "@/lib/interfaces/card-holds";
import { IconHandStop } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardHoldBadge({ scanIds, className }: CardHoldBadgeProps) {
  const { t } = useTranslation("common");
  const hold = useCardHoldsContext()?.holdFor(scanIds);
  if (!hold) return null;
  return (
    <Badge variant={hold.isMine ? "info" : "warning"} className={className}>
      <IconHandStop aria-hidden />
      {hold.isMine ? t("cardHolds.yourHoldBadge") : t("cardHolds.onHoldBadge")}
    </Badge>
  );
}
