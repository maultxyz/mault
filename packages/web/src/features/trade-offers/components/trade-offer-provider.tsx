import type { TradeOfferContextValue, TradeOfferProviderProps } from "@/lib/interfaces/trade-offers";
import { readTradeOfferDraft } from "@/features/trade-offers/lib/trade-offer-draft-storage";
import { TradeOfferContext } from "@/lib/trade-offer-context";
import { TRADE_OFFER_WANTED_CARDS_MAX, type PublicCard } from "@magic-vault/shared";
import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferProvider({ draftLinkToken, onOpenComposer, children }: TradeOfferProviderProps) {
  const { t } = useTranslation("cards");
  const [wanted, setWanted] = useState<PublicCard[]>(() =>
    draftLinkToken ? (readTradeOfferDraft(draftLinkToken)?.wanted ?? []) : [],
  );

  const value = useMemo<TradeOfferContextValue>(
    () => ({
      wanted,
      isWanted: (scanId) => wanted.some((entry) => entry.scanId === scanId),
      toggleWanted: (entry) => {
        const isAdding = !wanted.some((item) => item.scanId === entry.scanId);
        if (isAdding && wanted.length >= TRADE_OFFER_WANTED_CARDS_MAX) {
          toast.warning(t("tradeOffers.wantedLimit", { max: TRADE_OFFER_WANTED_CARDS_MAX }));
          return;
        }
        setWanted((current) =>
          current.some((item) => item.scanId === entry.scanId)
            ? current.filter((item) => item.scanId !== entry.scanId)
            : current.length >= TRADE_OFFER_WANTED_CARDS_MAX
              ? current
              : [...current, entry],
        );
      },
      removeWanted: (scanId) =>
        setWanted((current) => current.filter((entry) => entry.scanId !== scanId)),
      clearWanted: () => setWanted([]),
      replaceWanted: (entries) => setWanted(entries.slice(0, TRADE_OFFER_WANTED_CARDS_MAX)),
      openComposer: onOpenComposer,
    }),
    [wanted, onOpenComposer, t],
  );

  return <TradeOfferContext value={value}>{children}</TradeOfferContext>;
}
