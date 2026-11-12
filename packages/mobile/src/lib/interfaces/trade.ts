import type { ReactNode } from "react";
import type { CardCondition, ParsedShareLinkUrl, PublicCard, ShareLinkPurpose } from "@magic-vault/shared";

export type TradeLinkRef = ParsedShareLinkUrl;

export interface OfferedTradeCard {
  key: string;
  gameKey: string;
  lang: string;
  cardId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string | null;
  quantity: number;
  condition: CardCondition;
  isFoil: boolean;
}

export type NewOfferedTradeCard = Omit<OfferedTradeCard, "key" | "quantity">;

export interface TradeDraft {
  link: TradeLinkRef | null;
  wanted: PublicCard[];
  offered: OfferedTradeCard[];
}

export interface TradeLinkInfo {
  name: string;
  purpose: ShareLinkPurpose;
}

export interface TradeCardRowProps {
  name: string;
  subtitle: string;
  imageUrl: string | null;
  onPress?: () => void;
  accessibilityHint?: string;
  selected?: boolean;
  right?: ReactNode;
}

export interface TradeScanNotice {
  noticeId: number;
  kind: "added" | "no-match" | "failed";
  cardName?: string;
}
