import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import { DEMO_PICKS_NAME, DEMO_PICKS_ROWS } from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { IconCheck, IconTruckDelivery } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoPicks() {
  const { t } = useTranslation("landing");
  const picked = DEMO_PICKS_ROWS.filter((row) => row.picked).length;

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <IconTruckDelivery size={16} className="text-primary" />
          {DEMO_PICKS_NAME}
        </span>
        <span className="text-foreground/70 tabular-nums">
          {t("features.demo.picked", {
            picked,
            total: DEMO_PICKS_ROWS.length,
          })}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {DEMO_PICKS_ROWS.map((row) => {
          const { card } = DEMO_SCANNED_CARDS[row.cardIndex];
          return (
            <div
              key={card.id}
              className="flex items-center gap-2.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-sm",
                  row.picked
                    ? "bg-primary text-primary-foreground"
                    : "border border-input",
                )}
              >
                {row.picked && <IconCheck size={12} />}
              </span>
              <span className="w-28 shrink-0 truncate font-heading font-semibold text-primary tabular-nums">
                {row.box} #{row.position}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  row.picked && "text-foreground/70 line-through",
                )}
              >
                {card.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
