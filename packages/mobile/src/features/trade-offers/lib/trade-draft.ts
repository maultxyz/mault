import * as Crypto from "expo-crypto";
import {
  TRADE_OFFER_CARD_QUANTITY_MAX,
  TRADE_OFFER_OFFERED_CARDS_MAX,
  TRADE_OFFER_WANTED_CARDS_MAX,
  type PublicCard,
} from "@magic-vault/shared";
import type { NewOfferedTradeCard, OfferedTradeCard, TradeDraft, TradeLinkRef } from "@/lib/interfaces/trade";

const listeners = new Set<() => void>();
let draft: TradeDraft = { link: null, wanted: [], offered: [] };

function update(next: TradeDraft): void {
  draft = next;
  for (const listener of listeners) listener();
}

export function subscribeToTradeDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readTradeDraft(): TradeDraft {
  return draft;
}

export function startTradeDraft(link: TradeLinkRef): void {
  if (draft.link?.token === link.token && draft.link.guid === link.guid) return;
  update({ link, wanted: [], offered: [] });
}

export function toggleWantedCard(card: PublicCard): void {
  const isWanted = draft.wanted.some((entry) => entry.scanId === card.scanId);
  if (!isWanted && draft.wanted.length >= TRADE_OFFER_WANTED_CARDS_MAX) return;
  update({
    ...draft,
    wanted: isWanted
      ? draft.wanted.filter((entry) => entry.scanId !== card.scanId)
      : [...draft.wanted, card],
  });
}

export function addOfferedCard(card: NewOfferedTradeCard): void {
  const existing = draft.offered.find(
    (entry) =>
      entry.gameKey === card.gameKey &&
      entry.lang === card.lang &&
      entry.cardId === card.cardId &&
      entry.condition === card.condition &&
      entry.isFoil === card.isFoil,
  );
  if (existing) {
    updateOfferedCard(existing.key, {
      quantity: Math.min(existing.quantity + 1, TRADE_OFFER_CARD_QUANTITY_MAX),
    });
    return;
  }
  if (draft.offered.length >= TRADE_OFFER_OFFERED_CARDS_MAX) return;
  update({ ...draft, offered: [...draft.offered, { ...card, key: Crypto.randomUUID(), quantity: 1 }] });
}

export function updateOfferedCard(key: string, patch: Partial<OfferedTradeCard>): void {
  update({
    ...draft,
    offered: draft.offered.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
  });
}

export function removeOfferedCard(key: string): void {
  update({ ...draft, offered: draft.offered.filter((entry) => entry.key !== key) });
}

export function clearTradeCards(): void {
  update({ ...draft, wanted: [], offered: [] });
}
