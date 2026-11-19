import { DEFAULT_TRADE_OFFER_LANGUAGE } from "@/lib/constants/trade-offers";
import type { OfferedCardDraft } from "@/lib/interfaces/trade-offers";
import type { TradeOfferRequest } from "@magic-vault/shared";

export function toOfferedCardInput(draft: OfferedCardDraft): TradeOfferRequest["offered"][number] {
  return {
    gameKey: draft.option.gameKey,
    lang: draft.option.lang || DEFAULT_TRADE_OFFER_LANGUAGE,
    cardId: draft.option.cardId,
    quantity: draft.quantity,
    condition: draft.condition,
    isFoil: draft.isFoil,
  };
}
