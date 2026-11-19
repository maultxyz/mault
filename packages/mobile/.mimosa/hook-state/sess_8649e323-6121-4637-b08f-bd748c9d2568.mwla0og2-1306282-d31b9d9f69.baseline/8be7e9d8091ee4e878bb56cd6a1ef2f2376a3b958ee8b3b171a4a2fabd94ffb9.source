import type { ReactNode } from "react";
import type {
  OutgoingTradeOffer,
  PriceSource,
  PublicTradeOffer,
  TradeOffer,
  TradeOfferCardGroup,
  TradeOfferPickListItem,
  TradeOfferReviewCard,
  TradeOfferStatus,
  TradeOfferWantedPlacement,
} from "@magic-vault/shared";
import type { TRADE_OFFER_SIDES, TRADES_BOXES } from "@/lib/constants/trade-offers";
import type { StatusTone } from "@/lib/interfaces/theme";

export interface TradeOfferLibrarySectionProps {
  title: string;
  offers: TradeOffer[];
}

export type TradeOfferStatusTones = Record<TradeOfferStatus, StatusTone>;

export interface TradeOfferReviewSideProps {
  title: string;
  cards: TradeOfferReviewCard[];
  prices: (number | null)[];
  placements?: (TradeOfferWantedPlacement | null)[];
  priceSource: PriceSource;
  showsPrices?: boolean;
  children?: ReactNode;
}

export interface TradeOfferOfferedCashProps {
  offer: Pick<PublicTradeOffer, "offered" | "offeredCash">;
}

export interface TradeOfferReviewRowProps {
  row: TradeOfferCardGroup;
  priceSource: PriceSource;
  showsPlacement: boolean;
  showsPrice?: boolean;
}

export type TradeOfferSide = (typeof TRADE_OFFER_SIDES)[number];

export interface TradeOfferPicking {
  remainingScanIds: string[];
  placements: (TradeOfferWantedPlacement | null)[];
  pickError: string | null;
  markPicked: (scanId: string) => void;
  finish: () => void;
  isFinishing: boolean;
}

export interface TradeOfferPickListProps {
  offer: TradeOffer;
  remainingScanIds: string[];
  placements: (TradeOfferWantedPlacement | null)[];
  onPicked: (scanId: string) => void;
}

export interface TradeOfferPickListRowProps {
  item: TradeOfferPickListItem;
  priceSource: PriceSource;
  onPicked: (scanId: string) => void;
}

export interface TradeOfferReviewProps {
  offer: TradeOffer;
}

export type TradesBox = (typeof TRADES_BOXES)[number];

export interface OutgoingTradeOfferReviewProps {
  offer: OutgoingTradeOffer;
}
