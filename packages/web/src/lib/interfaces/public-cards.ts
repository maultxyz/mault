import type {
  ShareLinkPurpose,
  PublicCard,
  PublicCardBrowseInfo,
  PublicCardFacets,
  PublicCardFilters,
  PublicCardPage,
  PublicCardSort,
} from "@magic-vault/shared";
import type { ScanStats, SessionMonitorState } from "@/lib/interfaces/scanner";
import type { TradeOfferLink } from "@/lib/interfaces/trade-offers";
import type { ReactNode } from "react";

export type PublicCardsErrorKind = "notFound" | "unavailable";

export interface PublicCardsRequest {
  page: number;
  pageSize: number;
  sort: PublicCardSort;
  search: string;
  gameKey: string | null;
  filters: PublicCardFilters;
}

export interface PublicCardsSource {
  basePath: string;
  linkParams: Record<string, string>;
}

export interface PublicCardBrowserProps {
  source: PublicCardsSource;
  title: string;
  info: PublicCardBrowseInfo;
  titleBadge?: ReactNode;
  headerNote?: ReactNode;
  sidebarTop?: ReactNode;
  tradeOfferLink?: TradeOfferLink;
  reservationHoldDays?: number | null;
  reservationsRequireAccount?: boolean;
}

export interface PublicCardResultsProps {
  info: PublicCardBrowseInfo;
  page: PublicCardPage | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onOpenCard: (scanId: string) => void;
}

export interface PublicCardTileProps {
  entry: PublicCard;
  onOpen: (scanId: string) => void;
}

export interface PublicCardDetailViewProps {
  source: PublicCardsSource;
  scanId: string;
  onClose?: () => void;
}

export interface PoweredByMaultProps {
  className?: string;
  isInverted?: boolean;
}

export interface SharedCardViewProps {
  token: string;
  scanId: string;
}

export interface PublicCardBadgesProps {
  entry: PublicCard;
  className?: string;
  children?: ReactNode;
}

export interface PublicCardFilterPanelProps {
  info: PublicCardBrowseInfo;
  facets: PublicCardFacets | undefined;
  gameKey: string;
  onGameKeyChange: (gameKey: string) => void;
  sort: PublicCardSort;
  sorts: readonly PublicCardSort[];
  onSortChange: (sort: PublicCardSort) => void;
  filters: PublicCardFilters;
  onFiltersChange: (filters: PublicCardFilters) => void;
  minPriceInput: string;
  maxPriceInput: string;
  onMinPriceInputChange: (value: string) => void;
  onMaxPriceInputChange: (value: string) => void;
  onClear: () => void;
}

export interface WatchCardBrowserProps {
  token: string;
  collectionGuid: string;
  collectionName: string;
  purpose: ShareLinkPurpose;
  requiresGuestContact: boolean;
  requiresGuestAccount: boolean;
  session: SessionMonitorState;
}

export interface WatchLiveSidebarProps {
  session: SessionMonitorState;
  stats: ScanStats | null;
  cardCount: number;
}

export interface StorageCardBrowserProps {
  token: string;
  locationName: string;
  purpose: ShareLinkPurpose;
  requiresGuestContact: boolean;
  requiresGuestAccount: boolean;
}

export interface PublicAccountHeaderButtonProps {
  isIconOnly?: boolean;
}

export type GuestAccountKind = "tradeOffers" | "reservations";

export interface GuestAccountNoticeProps {
  kind: GuestAccountKind;
  isAccountRequired: boolean;
  onBeforeSignIn?: () => void;
}

export interface GuestKindBadgeProps {
  isFromAccount: boolean | null | undefined;
}
