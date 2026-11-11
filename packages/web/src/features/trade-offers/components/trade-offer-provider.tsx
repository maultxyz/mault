import type { TradeOfferContextValue, TradeOfferProviderProps } from "@/lib/interfaces/trade-offers";
import { TradeOfferContext } from "@/lib/trade-offer-context";
import { TRADE_OFFER_WANTED_CARDS_MAX, type PublicCard } from "@magic-vault/shared";
import { useMemo, useState } from "react";

export function TradeOfferProvider({ onOpenComposer, children }: TradeOfferProviderProps) {
  const [wanted, setWanted] = useState<PublicCard[]>([]);

  const value = useMemo<TradeOfferContextValue>(
    () => ({
      wanted,
      isWanted: (scanId) => wanted.some((entry) => entry.scanId === scanId),
      toggleWanted: (entry) =>
        setWanted((current) =>
          current.some((item) => item.scanId === entry.scanId)
            ? current.filter((item) => item.scanId !== entry.scanId)
            : current.length >= TRADE_OFFER_WANTED_CARDS_MAX
              ? current
              : [...current, entry],
        ),
      removeWanted: (scanId) =>
        setWanted((current) => current.filter((entry) => entry.scanId !== scanId)),
      clearWanted: () => setWanted([]),
      openComposer: onOpenComposer,
    }),
    [wanted, onOpenComposer],
  );

  return <TradeOfferContext value={value}>{children}</TradeOfferContext>;
}
