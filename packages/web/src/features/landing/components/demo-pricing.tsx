import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import {
  DEMO_PRICING_CARD_INDEX,
  DEMO_PRICING_PRICES,
} from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import {
  CARD_CONDITIONS,
  DEFAULT_CONDITION_MULTIPLIERS,
  PRICE_SOURCES,
  formatPrice,
  type PriceSource,
} from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function DemoPricing() {
  const { t } = useTranslation("landing");
  const [source, setSource] = useState<PriceSource>(PRICE_SOURCES[0]);
  const demo = DEMO_SCANNED_CARDS[DEMO_PRICING_CARD_INDEX];
  const price = DEMO_PRICING_PRICES[source];

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1 ring-1 ring-input">
        {PRICE_SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            className={cn(
              "truncate rounded-md px-2 py-1 text-sm font-medium transition-colors",
              s === source
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            {t(`features.priceSources.${s}`)}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <img
          src={demo.card.image?.normal ?? ""}
          alt={demo.card.name}
          className="aspect-5/7 w-20 shrink-0 self-start rounded-md object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {CARD_CONDITIONS.map((condition) => (
            <div
              key={condition}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="font-medium">{condition}</span>
              <span className="text-foreground/70 tabular-nums">
                {formatPrice(
                  (price * DEFAULT_CONDITION_MULTIPLIERS[condition]) / 100,
                  source,
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
