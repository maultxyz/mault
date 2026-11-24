import type { PlayingCardImage } from "./card.interface";

export interface ScanGiftReveal {
  scanId: string;
  collectionGuid: string | null;
  cardName: string;
  setName: string | null;
  image: PlayingCardImage | null;
  isFoil: boolean;
  price: number;
  currency: string;
}

export interface WrappedScanGiftReveal {
  reveal: ScanGiftReveal;
  wrappedAt: number;
}

export interface ScanGiftWrapStore {
  wrap(reveal: ScanGiftReveal, wrappedAt?: number): void;
  unwrap(scanId: string): void;
  wrappedRevealFor(scanIds: readonly string[], now?: number): ScanGiftReveal | null;
  latestReveal(): ScanGiftReveal | null;
  subscribe(listener: () => void): () => void;
  version(): number;
}
