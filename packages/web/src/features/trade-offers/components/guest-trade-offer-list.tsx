import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { guestTradeOffersQueryOptions } from "@/features/trade-offers/api/public-trade-offers";
import { TradeOfferCardList } from "@/features/trade-offers/components/trade-offer-card-list";
import {
  GUEST_TRADE_OFFERS_ACCORDION_VALUE,
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
} from "@/lib/constants/trade-offers";
import type { GuestTradeOfferListProps } from "@/lib/interfaces/trade-offers";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function GuestTradeOfferList({ link }: GuestTradeOfferListProps) {
  const { t, i18n } = useTranslation("cards");
  const { data: offers = [] } = useQuery(guestTradeOffersQueryOptions(link));
  if (offers.length === 0) return null;

  return (
    <Accordion>
      <AccordionItem value={GUEST_TRADE_OFFERS_ACCORDION_VALUE} className="border-b-0">
        <AccordionTrigger className="py-1 text-xs font-medium text-foreground/70">
          {t("tradeOffers.yourOffers", { count: offers.length })}
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          <ul className="flex flex-col gap-3 md:gap-2">
            {offers.map((offer) => (
              <li key={offer.guid} className="flex flex-col gap-2 rounded-card bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground/70">
                    {new Date(offer.createdAt).toLocaleString(i18n.language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
                    {t(`tradeOffers.status.${offer.status}`)}
                  </Badge>
                </div>
                <div className="grid gap-3 md:gap-2 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-xs text-foreground/70">{t("tradeOffers.youWant")}</p>
                    <TradeOfferCardList cards={offer.wanted} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-xs text-foreground/70">{t("tradeOffers.youOffer")}</p>
                    <TradeOfferCardList cards={offer.offered} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
