export interface BotTopCard {
  name: string;
  setName: string | null;
  foil: string | null;
  collectionName: string;
  priceDisplay: string;
  imageUrl: string | null;
}

export interface BotCollectionStats {
  collectionCount: number;
  cardCount: number;
  totalValue: number;
  totalValueDisplay: string;
  collectionName?: string;
  topCard: BotTopCard | null;
}
