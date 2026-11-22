import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import type {
  CardReservation,
  CardReservationCard,
  CardReservationRequestGroup,
  PublicCard,
  PublicCardReservation,
} from "@magic-vault/shared";
import type { ReactNode } from "react";

export interface CardReservationsContextValue {
  holdDays: number;
  cart: PublicCard[];
  isInCart: (scanId: string) => boolean;
  toggleInCart: (entry: PublicCard) => void;
  removeFromCart: (scanId: string) => void;
  clearCart: () => void;
  openComposer: () => void;
  mine: PublicCardReservation[];
  activeMineCount: number;
  queueLengthOf: (scanId: string) => number;
  myReservationFor: (scanId: string) => PublicCardReservation | null;
  cancelReservation: (reservation: PublicCardReservation) => void;
  cancellingReservationGuid: string | null;
}

export interface CardReservationsProviderProps {
  source: PublicCardsSource;
  holdDays: number;
  onOpenComposer: () => void;
  children: ReactNode;
}

export interface ReservationComposerPageProps {
  source: PublicCardsSource;
  sourceName: string;
  showsPrices: boolean;
  isVisible: boolean;
  onBack: () => void;
  onOpenCard: (scanId: string) => void;
}

export interface GuestCardReservationListProps {
  onOpenCard: (scanId: string) => void;
}

export interface CardReservationsHeaderButtonProps {
  isIconOnly?: boolean;
}

export interface CardReservationTileBadgeProps {
  scanId: string;
}

export interface CardReservationQuickToggleProps {
  entry: PublicCard;
}

export interface ReserveCardSectionProps {
  entry: PublicCard;
}

export interface CardReservationCardSummaryProps {
  card: CardReservationCard;
}

export type CardReservationActionTarget =
  | { kind: "reservation"; reservation: CardReservation; group: CardReservationRequestGroup }
  | { kind: "request"; group: CardReservationRequestGroup };

export interface CardReservationActionHandlers {
  canAct: boolean;
  busyKey: string | null;
  onCollect: (target: CardReservationActionTarget) => void;
  onRelease: (target: CardReservationActionTarget) => void;
  onCreatePick: (group: CardReservationRequestGroup) => void;
}

export interface CardReservationRowProps extends CardReservationActionHandlers {
  reservation: CardReservation;
  group: CardReservationRequestGroup;
  showsCardActions: boolean;
}

export interface CardReservationRequestCardProps extends CardReservationActionHandlers {
  group: CardReservationRequestGroup;
}

export interface CardReservationRequestSectionProps extends CardReservationActionHandlers {
  title: string;
  description?: string;
  groups: CardReservationRequestGroup[];
}

export interface ReservationsWorkspaceProps {
  switcher: ReactNode;
}

export type CardReservationConfirmation = {
  action: "collect" | "release";
  target: CardReservationActionTarget;
} | null;

export interface CardReservationConfirmText {
  title: string;
  description: string;
  confirmLabel: string;
  success: string;
}

export interface CardReservationRequestListProps {
  title: string;
  groups: CardReservationRequestGroup[];
  selectedRequestGuid: string | null;
  onSelect: (requestGuid: string) => void;
}
