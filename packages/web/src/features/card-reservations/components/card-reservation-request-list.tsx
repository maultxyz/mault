import { Badge } from "@/components/ui/badge";
import { GuestKindBadge } from "@/components/guest-kind-badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/features/business/lib/format";
import { useCardReservationGroupSummary } from "@/features/card-reservations/lib/use-card-reservation-group-summary";
import { CARD_RESERVATION_STAGE_BADGE_VARIANTS } from "@/lib/constants/card-reservations";
import type { CardReservationRequestListProps } from "@/lib/interfaces/card-reservations";
import { cardReservationGroupStage } from "@magic-vault/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function CardReservationRequestList({
  title,
  groups,
  selectedRequestGuid,
  onSelect,
}: CardReservationRequestListProps) {
  const { t } = useTranslation("business");
  const headingId = useId();
  const summary = useCardReservationGroupSummary();
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h2 id={headingId} className="px-1 text-xs font-semibold text-foreground/70">
        {title}
      </h2>
      <ul className="flex flex-col gap-1">
        {groups.map((group) => {
          const stage = cardReservationGroupStage(group);
          const isSelected = group.requestGuid === selectedRequestGuid;
          return (
            <li key={group.requestGuid}>
              <Button
                variant={isSelected ? "selected" : "ghost"}
                aria-current={isSelected || undefined}
                className="h-auto w-full min-w-0 flex-col items-start justify-start gap-0.5 p-2 text-start"
                onClick={() => onSelect(group.requestGuid)}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {group.guestName}
                  </span>
                  <GuestKindBadge isFromAccount={group.isFromAccount} />
                  <Badge variant={stage ? CARD_RESERVATION_STAGE_BADGE_VARIANTS[stage] : "secondary"}>
                    {stage ? t(`reservations.stages.${stage}`) : t("reservations.groupClosed")}
                  </Badge>
                </span>
                <span className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
                  <span className="min-w-0 truncate">{summary(group)}</span>
                  <span className="shrink-0">{formatDay(group.createdAt)}</span>
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
