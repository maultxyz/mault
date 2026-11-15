import { TRADE_OFFER_DRAFT_STORAGE_KEY_PREFIX } from "@/lib/constants/trade-offers";
import type { TradeOfferDraftSnapshot } from "@/lib/interfaces/trade-offers";

function draftStorageKey(linkToken: string): string {
  return `${TRADE_OFFER_DRAFT_STORAGE_KEY_PREFIX}${linkToken}`;
}

export function saveTradeOfferDraft(linkToken: string, draft: TradeOfferDraftSnapshot): void {
  try {
    sessionStorage.setItem(draftStorageKey(linkToken), JSON.stringify(draft));
  } catch {}
}

export function readTradeOfferDraft(linkToken: string): TradeOfferDraftSnapshot | null {
  try {
    const stored = sessionStorage.getItem(draftStorageKey(linkToken));
    return stored ? (JSON.parse(stored) as TradeOfferDraftSnapshot) : null;
  } catch {
    return null;
  }
}

export function clearTradeOfferDraft(linkToken: string): void {
  try {
    sessionStorage.removeItem(draftStorageKey(linkToken));
  } catch {}
}
