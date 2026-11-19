import type { PlayingCard } from "./interfaces/card.interface";

export async function withRawCardDataForRules<C extends PlayingCard>(
  card: C,
  loadCatalogCard: (card: C) => Promise<PlayingCard | null>,
): Promise<C> {
  if (card.raw != null) return card;
  const catalogCard = await loadCatalogCard(card);
  return catalogCard?.raw != null ? { ...card, raw: catalogCard.raw } : card;
}
