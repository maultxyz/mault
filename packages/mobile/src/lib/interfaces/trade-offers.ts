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
  undoablePickScanIds: ReadonlySet<string>;
  markPicked: (scanId: string) => void;
  undoPick: (scanId: string) => void;
  finish: () => void;
  isFinishing: boolean;
}

export interface TradeOfferPickListProps {
  offer: TradeOffer;
  remainingScanIds: string[];
  placements: (TradeOfferWantedPlacement | null)[];
  undoablePickScanIds: ReadonlySet<string>;
  onPicked: (scanId: string) => void;
  onUndoPick: (scanId: string) => void;
}

export interface TradeOfferPickListRowProps {
  item: TradeOfferPickListItem;
  priceSource: PriceSource;
  isUndoable: boolean;
  onPicked: (scanId: string) => void;
  onUndoPick: (scanId: string) => void;
}

export interface TradeOfferReviewProps {
  offer: TradeOffer;
}

export type TradesBox = (typeof TRADES_BOXES)[number];

export interface OutgoingTradeOfferReviewProps {
  offer: OutgoingTradeOffer;
}

export type NewTradeSheet = "kind" | "source";

export interface NewTradeSheetsProps {
  openSheet: NewTradeSheet | null;
  onOpenSheetChange: (sheet: NewTradeSheet | null) => void;
}

export interface InPersonGivenTradeCard {
  scanId: string;
  name: string;
  subtitle: string;
  imageUrl: string | null;
}

export interface TradeOfferReviewSkeletonProps {
  hasValueSummary: boolean;
}
