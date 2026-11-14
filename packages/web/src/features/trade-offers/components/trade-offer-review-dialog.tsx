import { Callout } from "@/components/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useRespondToTradeOffer } from "@/features/trade-offers/api/trade-offers";
import { TradeOfferReviewSide } from "@/features/trade-offers/components/trade-offer-review-side";
import { TradeOfferValueSummary } from "@/features/trade-offers/components/trade-offer-value-summary";
import { TRADE_OFFER_STATUS_BADGE_VARIANTS } from "@/lib/constants/trade-offers";
import type { TradeOfferReviewDialogProps } from "@/lib/interfaces/trade-offers";
import { IconCheck, IconLoader2, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferReviewDialog({ offer, onOpenChange }: TradeOfferReviewDialogProps) {
  const { t, i18n } = useTranslation("common");
  const respond = useRespondToTradeOffer();
  const answer = (accepts: boolean) => {
    if (!offer) return;
    respond.mutate(
      { guid: offer.guid, accepts },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <DynamicDialog
      open={!!offer}
      onOpenChange={onOpenChange}
      title={t("tradeOffers.reviewTitle", { name: offer?.guestName ?? "" })}
      description={
        offer
          ? t("tradeOffers.reviewDescription", {
              source: offer.sourceName ?? t("tradeOffers.unknownSource"),
              date: new Date(offer.createdAt).toLocaleString(i18n.language, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })
          : ""
      }
      className="sm:max-w-3xl"
      footer={
        offer?.status === "pending" ? (
          <>
            <Button
              variant="outline"
              className="text-destructive"
              disabled={respond.isPending}
              onClick={() => answer(false)}
            >
              <IconX />
              {t("tradeOffers.decline")}
            </Button>
            <Button disabled={respond.isPending} onClick={() => answer(true)}>
              {respond.isPending ? <IconLoader2 className="animate-spin" /> : <IconCheck />}
              {t("tradeOffers.accept")}
            </Button>
          </>
        ) : undefined
      }
    >
      {offer && (
        <div className="-mx-1 flex flex-col gap-4 px-1 md:min-h-0 md:flex-1 md:gap-3 md:overflow-y-auto">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-control">
            <dt className="text-foreground/70">{t("tradeOffers.contact")}</dt>
            <dd className="break-words select-all">{offer.guestContact}</dd>
            {offer.guestNote && (
              <>
                <dt className="text-foreground/70">{t("tradeOffers.note")}</dt>
                <dd className="break-words whitespace-pre-line">{offer.guestNote}</dd>
              </>
            )}
          </dl>
          <TradeOfferValueSummary offer={offer} />
          {offer.status === "pending" ? (
            <Callout variant="warning">
              {t("tradeOffers.acceptRemovesCards", { count: offer.wanted.length })}
            </Callout>
          ) : (
            <p className="flex items-center gap-1.5 text-control">
              <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
                {t(`tradeOffers.library.status.${offer.status}`)}
              </Badge>
              {offer.respondedAt &&
                new Date(offer.respondedAt).toLocaleString(i18n.language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
            </p>
          )}
          <TradeOfferReviewSide
            title={t("tradeOffers.theyWant", { count: offer.wanted.length })}
            cards={offer.wanted}
            prices={offer.wantedPrices}
            placements={offer.wantedPlacements}
            priceSource={offer.priceSource}
          />
          <TradeOfferReviewSide
            title={t("tradeOffers.theyOffer", {
              count: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
            })}
            cards={offer.offered}
            prices={offer.offeredPrices}
            priceSource={offer.priceSource}
          />
        </div>
      )}
    </DynamicDialog>
  );
}
