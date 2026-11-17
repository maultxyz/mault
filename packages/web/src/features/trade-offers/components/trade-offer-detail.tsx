import { Callout } from "@/components/callout";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewTabs } from "@/components/view-tabs";
import {
  useRespondToTradeOffer,
  useTradeOfferPicking,
} from "@/features/trade-offers/api/trade-offers";
import { TradeOfferOfferedCash } from "@/features/trade-offers/components/trade-offer-offered-cash";
import { TradeOfferPickList } from "@/features/trade-offers/components/trade-offer-pick-list";
import { TradeOfferPickProgress } from "@/features/trade-offers/components/trade-offer-pick-progress";
import { TradeOfferReviewSide } from "@/features/trade-offers/components/trade-offer-review-side";
import { TradeOfferValueSummary } from "@/features/trade-offers/components/trade-offer-value-summary";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_PAGE_BODY_CLASS } from "@/lib/constants/nav";
import {
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
  TRADES_PATH,
} from "@/lib/constants/trade-offers";
import type {
  TradeOfferConfirmation,
  TradeOfferDetailProps,
  TradeOfferSide,
} from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import {
  TRADE_OFFER_THEY_OFFER_TITLE_KEYS,
  isTradeOfferBeingPicked,
  tradeOfferOfferKind,
  tradeOfferOfferedCardCount,
  tradeOfferPickProgress,
} from "@magic-vault/shared";
import { IconCheck, IconChecks, IconLoader2, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferDetail({ offer }: TradeOfferDetailProps) {
  const { t, i18n } = useTranslation("common");
  const isMobile = useIsMobile();
  const respond = useRespondToTradeOffer();
  const picking = useTradeOfferPicking(offer);
  const [visibleSide, setVisibleSide] = useState<TradeOfferSide>("wanted");
  const [confirmation, setConfirmation] = useState<TradeOfferConfirmation>(null);
  const isPending = offer.status === "pending";
  const isPicking = isTradeOfferBeingPicked(offer);
  const progress = tradeOfferPickProgress(offer.wanted, picking.remainingScanIds);
  const offeredCount = tradeOfferOfferedCardCount(offer);
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const title = t("tradeOffers.reviewTitle", {
    name: offer.guestName || t("tradeOffers.library.unnamedGuest"),
  });
  const description = t("tradeOffers.reviewDescription", {
    source: offer.sourceName ?? t("tradeOffers.unknownSource"),
    date: formatDate(offer.createdAt),
  });
  const isBusy = respond.isPending || picking.finish.isPending;

  const confirm = () => {
    if (confirmation === "finish") {
      picking.finish.mutate(undefined, { onSettled: () => setConfirmation(null) });
    } else if (confirmation === "accept" || confirmation === "decline") {
      respond.mutate(
        { guid: offer.guid, accepts: confirmation === "accept" },
        { onSettled: () => setConfirmation(null) },
      );
    }
  };

  const actions = isPending ? (
    <>
      <Button
        variant="destructive"
        className="max-md:flex-1"
        disabled={isBusy}
        onClick={() => setConfirmation("decline")}
      >
        {respond.isPending && respond.variables?.accepts === false ? (
          <IconLoader2 className="animate-spin motion-reduce:animate-none" />
        ) : (
          <IconX />
        )}
        {t("tradeOffers.decline")}
      </Button>
      <Button className="max-md:flex-1" disabled={isBusy} onClick={() => setConfirmation("accept")}>
        {respond.isPending && respond.variables?.accepts ? <IconLoader2 className="animate-spin motion-reduce:animate-none" /> : <IconCheck />}
        {t("tradeOffers.accept")}
      </Button>
    </>
  ) : isPicking ? (
    <Button className="max-md:flex-1" disabled={isBusy} onClick={() => setConfirmation("finish")}>
      {picking.finish.isPending ? (
        <IconLoader2 className="animate-spin motion-reduce:animate-none" />
      ) : (
        <IconChecks />
      )}
      {t("tradeOffers.pickList.finish")}
    </Button>
  ) : null;

  const sideTabs = (
    <ViewTabs
      items={[
        { key: "wanted", label: t("tradeOffers.sideTabs.wanted", { count: offer.wanted.length }) },
        { key: "offered", label: t("tradeOffers.sideTabs.offered", { count: offeredCount }) },
      ]}
      value={visibleSide}
      onChange={setVisibleSide}
      label={t("tradeOffers.sideTabs.label")}
      fill={isMobile}
      className="md:hidden"
    />
  );

  const sideClassName = (side: TradeOfferSide) =>
    cn(
      "rounded-card bg-card p-3 md:p-2.5",
      visibleSide !== side && "max-md:hidden",
    );

  const body = (
    <>
      <div className="flex flex-col gap-3 md:gap-2">
        <div className="flex flex-col gap-2 rounded-card bg-card p-3 md:p-2.5">
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
          {isPending ? (
            <Callout variant="info">{t("tradeOffers.pickList.acceptHint")}</Callout>
          ) : (
            <p className="flex flex-wrap items-center gap-1.5 text-control">
              <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
                {t(`tradeOffers.library.status.${offer.status}`)}
              </Badge>
              {offer.respondedAt && formatDate(offer.respondedAt)}
            </p>
          )}
          {isPicking && (
            <TradeOfferPickProgress
              pickedCount={progress.pickedCount}
              totalCount={progress.totalCount}
            />
          )}
        </div>
        <TradeOfferValueSummary offer={offer} />
      </div>
      {sideTabs}
      <div className="grid items-start gap-3 md:grid-cols-2 md:gap-2">
        {isPicking ? (
          <TradeOfferPickList
            offer={offer}
            remainingScanIds={picking.remainingScanIds}
            placements={picking.placements}
            onPicked={picking.markPicked}
            className={sideClassName("wanted")}
          />
        ) : (
          <TradeOfferReviewSide
            title={t("tradeOffers.theyWant", { count: offer.wanted.length })}
            cards={offer.wanted}
            prices={offer.wantedPrices}
            placements={offer.wantedPlacements}
            priceSource={offer.priceSource}
            className={sideClassName("wanted")}
          />
        )}
        <TradeOfferReviewSide
          title={t(TRADE_OFFER_THEY_OFFER_TITLE_KEYS[tradeOfferOfferKind(offer)], { count: offeredCount })}
          cards={offer.offered}
          prices={offer.offeredPrices}
          priceSource={offer.priceSource}
          className={sideClassName("offered")}
        >
          <TradeOfferOfferedCash offer={offer} />
        </TradeOfferReviewSide>
      </div>
    </>
  );

  const dialog = (
    <ConfirmDialog
      open={confirmation != null}
      onOpenChange={(open) => {
        if (!open && !isBusy) setConfirmation(null);
      }}
      title={
        confirmation === "finish"
          ? t("tradeOffers.pickList.finishTitle")
          : confirmation === "decline"
            ? t("tradeOffers.declineTitle")
            : t("tradeOffers.acceptTitle")
      }
      description={
        confirmation === "finish"
          ? t("tradeOffers.pickList.finishDescription", { count: picking.remainingScanIds.length })
          : confirmation === "decline"
            ? t("tradeOffers.declineDescription")
            : t("tradeOffers.pickList.acceptDescription", { count: offer.wanted.length })
      }
      confirmLabel={
        confirmation === "finish"
          ? t("tradeOffers.pickList.finish")
          : confirmation === "decline"
            ? t("tradeOffers.decline")
            : t("tradeOffers.accept")
      }
      cancelLabel={t("actions.cancel")}
      destructive={confirmation === "finish" || confirmation === "decline"}
      isPending={isBusy}
      onConfirm={confirm}
    />
  );

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={title} subtitle={description} backTo={TRADES_PATH} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={MOBILE_PAGE_BODY_CLASS}>{body}</div>
        </div>
        {actions && (
          <div className="flex shrink-0 gap-1.5 border-t bg-background/80 p-2 backdrop-blur-2xl">
            {actions}
          </div>
        )}
        {dialog}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title={title}
        description={description}
        backTo={TRADES_PATH}
        backLabel={t("tradeOffers.backToTrades")}
        actions={actions}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:gap-2 md:px-3 md:py-2">
        {body}
      </div>
      {dialog}
    </div>
  );
}
