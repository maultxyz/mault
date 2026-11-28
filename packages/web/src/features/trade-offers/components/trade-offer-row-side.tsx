import { TradeOfferCardStack } from "@/features/trade-offers/components/trade-offer-card-stack";
import type { TradeOfferRowSideProps } from "@/lib/interfaces/trade-offers";
import { useTranslation } from "react-i18next";

export function TradeOfferRowSide({ label, cards, cardCount, value, cash }: TradeOfferRowSideProps) {
  const { t } = useTranslation("common");
  const details = [
    cardCount > 0 ? t("tradeOffers.library.cardCount", { count: cardCount }) : null,
    cash ? t("tradeOffers.cashAmount", { amount: cash }) : null,
  ].filter(Boolean);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="hidden lg:flex">
        <TradeOfferCardStack cards={cards} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-2xs text-foreground/70">{label}</span>
        {value !== undefined && (
          <span className="text-sm font-medium tabular-nums">{value}</span>
        )}
        <span className="truncate text-xs text-foreground/70">
          {details.length > 0 ? details.join(" · ") : t("tradeOffers.library.nothing")}
        </span>
      </span>
    </span>
  );
}
