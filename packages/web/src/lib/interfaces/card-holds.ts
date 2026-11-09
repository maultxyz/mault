import type {
  CardCondition,
  CardHoldRequest,
  CardHoldShareLinkKind,
  PlayingCardWithDistance,
  PublicCardHold,
} from "@magic-vault/shared";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

export interface CardHoldTarget {
  scanIds: string[];
  card: PlayingCardWithDistance;
  isFoil: boolean;
  foilType?: string;
  condition: CardCondition;
}

export interface CardHoldsContextValue {
  holdFor: (scanIds: string[]) => PublicCardHold | undefined;
  openHoldDialog: (target: CardHoldTarget) => void;
}

export interface CardHoldsProviderProps {
  kind: CardHoldShareLinkKind;
  token: string;
  holdMinutes: number | null;
  children: ReactNode;
}

export interface CardHoldDialogProps {
  target: CardHoldTarget | null;
  holdsByScanId: ReadonlyMap<string, PublicCardHold>;
  placeHold: UseMutationResult<void, Error, CardHoldRequest>;
  releaseHold: UseMutationResult<void, Error, string>;
  onClose: () => void;
}

export interface CardHoldBadgeProps {
  scanIds: string[];
  className?: string;
}

export interface CardHoldsButtonProps {
  scope: CardHoldOwnerScope;
  buttonVariant?: "outline" | "ghost";
  className?: string;
}

export type CardHoldOwnerScope =
  | { kind: "collection"; guid: string }
  | { kind: "storage"; guid: string };
