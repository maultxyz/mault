import type {
  MergedReceivedTradeCards,
  NewOfferedTradeCard,
  OfferedTradeCard,
  ReceivedTradeCardLimits,
} from "@/lib/interfaces/trade";

const listeners = new Set<() => void>();
let scannedCards: NewOfferedTradeCard[] = [];

function update(next: NewOfferedTradeCard[]): void {
  scannedCards = next;
  for (const listener of listeners) listener();
}

export function subscribeToInPersonScannedCards(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readInPersonScannedCardCount(): number {
  return scannedCards.length;
}

export function addInPersonScannedCard(card: NewOfferedTradeCard): void {
  update([...scannedCards, card]);
}

export function takeInPersonScannedCards(): NewOfferedTradeCard[] {
  const taken = scannedCards;
  if (taken.length > 0) update([]);
  return taken;
}

export function mergeReceivedTradeCards(
  current: OfferedTradeCard[],
  added: NewOfferedTradeCard[],
  limits: ReceivedTradeCardLimits,
  createKey: () => string,
): MergedReceivedTradeCards {
  let cards = current;
  let droppedCount = 0;
  for (const card of added) {
    const existing = cards.find(
      (entry) =>
        entry.gameKey === card.gameKey &&
        entry.lang === card.lang &&
        entry.cardId === card.cardId &&
        entry.condition === card.condition &&
        entry.isFoil === card.isFoil,
    );
    if (existing) {
      if (existing.quantity >= limits.maxQuantity) {
        droppedCount += 1;
        continue;
      }
      cards = cards.map((entry) => (entry.key === existing.key ? { ...entry, quantity: entry.quantity + 1 } : entry));
      continue;
    }
    if (cards.length >= limits.maxCards) {
      droppedCount += 1;
      continue;
    }
    cards = [...cards, { ...card, key: createKey(), quantity: 1 }];
  }
  return { cards, droppedCount };
}
