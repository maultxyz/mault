import type {
  CardCondition,
  PriceSource,
  PublicCard,
  TradeOffer,
  TradeOfferCardOption,
  TradeOfferOfferedCard,
  TradeOfferWantedCard,
} from "@magic-vault/shared";
import type { ReactNode } from "react";

export interface TradeOfferLink {
  basePath: string;
  token: string;
}

export interface OfferedCardDraft {
  option: TradeOfferCardOption;
  quantity: number;
  condition: CardCondition;
  isFoil: boolean;
}

export interface TradeOfferContextValue {
  wanted: PublicCard[];
  isWanted: (scanId: string) => boolean;
  toggleWanted: (entry: PublicCard) => void;
  removeWanted: (scanId: string) => void;
  clearWanted: () => void;
  openComposer: () => void;
}

export interface TradeOfferProviderProps {
  onOpenComposer: () => void;
  children: ReactNode;
}

export interface TradeOfferPageProps {
  link: TradeOfferLink;
  sourceName: string;
  defaultGameKey: string | null;
  isVisible: boolean;
  onBack: () => void;
}

export interface TradeOfferPanelProps {
  step: number;
  title: string;
  description: string;
  headingId: string;
  className?: string;
  children: ReactNode;
}

export interface TradeOfferCardSearchProps {
  link: TradeOfferLink;
  defaultGameKey: string | null;
  onAdd: (option: TradeOfferCardOption) => void;
}

export interface TradeOfferOfferedRowProps {
  draft: OfferedCardDraft;
  onChange: (draft: OfferedCardDraft) => void;
  onRemove: () => void;
}

export interface TradeOfferCardListProps {
  cards: (TradeOfferWantedCard | TradeOfferOfferedCard)[];
  prices?: (number | null)[];
  priceSource?: PriceSource;
}

export interface TradeOfferValueSummaryProps {
  offer: TradeOffer;
}

export interface GuestTradeOfferListProps {
  link: TradeOfferLink;
}

export interface TradeOfferReviewDialogProps {
  offer: TradeOffer | null;
  onOpenChange: (open: boolean) => void;
}
