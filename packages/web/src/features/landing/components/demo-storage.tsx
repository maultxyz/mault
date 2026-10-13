import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import {
  DEMO_STORAGE_ACTIVE_BOX,
  DEMO_STORAGE_BOXES,
  DEMO_STORAGE_CARD_INDEXES,
  DEMO_STORAGE_FIRST_POSITION,
  DEMO_STORAGE_HIGHLIGHT_INDEX,
  DEMO_STORAGE_SEARCH,
} from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { formatPrice } from "@magic-vault/shared";
import { IconArchive, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoStorage() {
  const { t } = useTranslation("landing");
  const cards = DEMO_STORAGE_CARD_INDEXES.map((i) => DEMO_SCANNED_CARDS[i]);

  return (
    <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-1.5">
        {DEMO_STORAGE_BOXES.map((box, i) => {
          const active = i === DEMO_STORAGE_ACTIVE_BOX;
          return (
            <div
              key={box.name}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-sm",
                active ? "border-primary/50 ring-1 ring-primary/30" : "border-input",
              )}
            >
              <IconArchive
                size={18}
                className={cn(
                  "shrink-0",
                  active ? "text-primary" : "text-foreground/70",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{box.name}</p>
                <p className="text-foreground/70 tabular-nums">
                  {t("features.demo.cardCount", { count: box.cardCount })}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">
                {formatPrice(box.value, "tcgplayer")}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <IconSearch size={16} className="shrink-0 text-foreground/70" />
          <span>{DEMO_STORAGE_SEARCH}</span>
        </div>
        {cards.map((d, i) => (
          <div
            key={d.card.id}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border p-1.5 pr-3 text-sm",
              i === DEMO_STORAGE_HIGHLIGHT_INDEX
                ? "border-primary/50 bg-primary/10"
                : "border-input bg-background",
            )}
          >
            <span className="w-11 shrink-0 text-center font-heading font-semibold text-primary tabular-nums">
              #{DEMO_STORAGE_FIRST_POSITION + i}
            </span>
            <img
              src={d.card.image?.small ?? ""}
              alt=""
              className="aspect-5/7 w-8 shrink-0 rounded-sm object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.card.name}</p>
              <p className="truncate text-foreground/70 uppercase">
                {d.card.set} {d.card.collectorNumber}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
