import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import {
  DEMO_INTAKE_CREDIT_BONUS,
  DEMO_INTAKE_CUSTOMER,
  DEMO_INTAKE_ROWS,
} from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { formatPrice } from "@magic-vault/shared";
import { IconCash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoIntake() {
  const { t } = useTranslation("landing");
  const cash = DEMO_INTAKE_ROWS.reduce(
    (sum, row) => sum + (row.declined ? 0 : row.offer),
    0,
  );
  const credit = cash * (1 + DEMO_INTAKE_CREDIT_BONUS / 100);

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <IconCash size={16} className="text-primary" />
          {t("features.demo.intakeLot", { name: DEMO_INTAKE_CUSTOMER })}
        </span>
        <span className="text-foreground/70">
          {t("features.demo.liveOffer")}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {DEMO_INTAKE_ROWS.map((row) => {
          const { card } = DEMO_SCANNED_CARDS[row.cardIndex];
          return (
            <div
              key={card.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-input bg-background p-1.5 pr-3 text-sm",
                row.declined && "text-foreground/70",
              )}
            >
              <img
                src={card.image?.small ?? ""}
                alt=""
                className="aspect-5/7 w-8 shrink-0 rounded-sm object-cover"
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-medium",
                  row.declined && "line-through",
                )}
              >
                {card.name}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums text-foreground/70",
                  row.declined && "line-through",
                )}
              >
                {formatPrice(row.market, "tcgplayer")}
              </span>
              <span
                className={cn(
                  "w-20 shrink-0 text-right font-semibold tabular-nums",
                  row.declined && "line-through",
                )}
              >
                {formatPrice(row.offer, "tcgplayer")}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-sm">
        <div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2">
          <p className="text-foreground/70">{t("features.demo.cash")}</p>
          <p className="font-heading font-semibold tabular-nums">
            {formatPrice(cash, "tcgplayer")}
          </p>
        </div>
        <div className="rounded-lg border border-input bg-background px-3 py-2">
          <p className="text-foreground/70">{t("features.demo.credit")}</p>
          <p className="font-heading font-semibold tabular-nums">
            {formatPrice(credit, "tcgplayer")}
          </p>
        </div>
      </div>
    </div>
  );
}
