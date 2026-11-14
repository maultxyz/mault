import type {
  CardCondition,
  PriceSource,
  PublicCard,
  TradeOffer,
  TradeOfferCardGroup,
  TradeOfferCardOption,
  TradeOfferPickListItem,
  TradeOfferReviewCard,
  TradeOfferWantedPlacement,
  TradeOfferOfferedCard,
  TradeOfferWantedCard,
} from "@magic-vault/shared";
import type { TRADE_OFFER_SIDES } from "@/lib/constants/trade-offers";
import type { TFunction } from "i18next";
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

export interface TradeOfferLibraryRowProps {
  offer: TradeOffer;
}

export interface TradeOfferLibrarySectionProps {
  title: string;
  offers: TradeOffer[];
}

export interface TradeOfferDetailProps {
  offer: TradeOffer;
}

export interface TradeOfferPickListProps {
  offer: TradeOffer;
  remainingScanIds: string[];
  placements: (TradeOfferWantedPlacement | null)[];
  onPicked: (scanId: string) => void;
  className?: string;
}

export interface TradeOfferPickListRowProps {
  item: TradeOfferPickListItem;
  priceSource: PriceSource;
  onPicked: (scanId: string) => void;
}

export interface TradeOfferPickProgressBarProps {
  pickedCount: number;
  totalCount: number;
}

export type TradeOfferReviewTFunction = TFunction<"common">;

export interface TradeOfferPlacementLine {
  text: string;
  isMissing: boolean;
}

export interface TradeOfferReviewSideProps {
  title: string;
  cards: TradeOfferReviewCard[];
  prices: (number | null)[];
  placements?: (TradeOfferWantedPlacement | null)[];
  priceSource: PriceSource;
  className?: string;
}

export interface TradeOfferReviewRowProps {
  row: TradeOfferCardGroup;
  priceSource: PriceSource;
  showsPlacement: boolean;
}

export type TradeOfferSide = (typeof TRADE_OFFER_SIDES)[number];

export type TradeOfferConfirmation = "accept" | "finish" | null;
