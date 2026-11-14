import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useRespondToTradeOffer } from "@/features/trade-offers/api/trade-offers";
import { TradeOfferCardList } from "@/features/trade-offers/components/trade-offer-card-list";
import { TradeOfferValueSummary } from "@/features/trade-offers/components/trade-offer-value-summary";
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
      className="sm:max-w-2xl"
      footer={
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
      }
    >
      {offer && (
        <div className="flex flex-col gap-4 md:gap-2">
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
          <Callout variant="warning">
            {t("tradeOffers.acceptRemovesCards", { count: offer.wanted.length })}
          </Callout>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-foreground/70">
              {t("tradeOffers.theyWant", { count: offer.wanted.length })}
            </h3>
            <TradeOfferCardList
              cards={offer.wanted}
              prices={offer.wantedPrices}
              priceSource={offer.priceSource}
            />
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-foreground/70">
              {t("tradeOffers.theyOffer", { count: offer.offered.length })}
            </h3>
            <TradeOfferCardList
              cards={offer.offered}
              prices={offer.offeredPrices}
              priceSource={offer.priceSource}
            />
          </section>
        </div>
      )}
    </DynamicDialog>
  );
}
