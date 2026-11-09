import type { z } from "zod";
import type { cardHoldRequestFormSchema } from "../schemas/forms.schema";
import type { CardCondition, ConditionMultipliers } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";
import type { CARD_HOLD_SHARE_LINK_KINDS } from "../constants/monitor-links.constant";

export interface MonitorLink {
  token: string;
  expiresAt: string;
}

export interface MonitorLinkInfo {
  collectionGuid: string;
  collectionName: string;
  expiresAt: string;
  priceSource: PriceSource;
  conditionMultipliers: ConditionMultipliers;
  showsPrices: boolean;
  holdMinutes: number | null;
}

export type CardHoldShareLinkKind = (typeof CARD_HOLD_SHARE_LINK_KINDS)[number];

export interface PublicCardHold {
  scanId: string;
  expiresAt: string | null;
  isApproved: boolean;
  isMine: boolean;
}

export interface CardHoldRequest {
  scanId: string;
  guestName: string;
  guestNote?: string;
}

export interface CardHold {
  guid: string;
  scanId: string;
  collectionGuid: string;
  cardName: string;
  cardSetName: string | null;
  cardImage: string | null;
  isFoil: boolean;
  condition: CardCondition;
  guestName: string;
  guestNote: string | null;
  shareLinkKind: CardHoldShareLinkKind;
  expiresAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface CardHoldsChangedEvent {
  collectionGuid: string;
  locationGuid: string | null;
  createdHold: { cardName: string; guestName: string } | null;
}

export type CardHoldRequestFormValues = z.infer<typeof cardHoldRequestFormSchema>;
