export interface CardTileSkeletonGridProps {
  count?: number;
  className?: string;
}

export interface ListSkeletonProps {
  rows?: number;
  leading?: "none" | "icon" | "thumbnail";
  hasSubtitle?: boolean;
  hasTrailing?: boolean;
  className?: string;
  rowClassName?: string;
}

export interface FormSkeletonProps {
  fields?: number;
  hasSubmit?: boolean;
  className?: string;
}

export interface BinCardSkeletonProps {
  className?: string;
}

export interface CardSearchResultSkeletonGridProps extends CardTileSkeletonGridProps {
  isReviewLayout?: boolean;
}

export interface SkeletonStatusProps {
  className?: string;
  children: import("react").ReactNode;
}

export interface StatGroupSkeletonProps {
  tiles: number;
  gridClassName?: string;
  hasIcons?: boolean;
  hasDetails?: boolean;
  prominent?: boolean;
}

export interface TableSkeletonColumn {
  barClassName: string;
  alignsEnd?: boolean;
  isThumbnail?: boolean;
  className?: string;
}

export interface TableSkeletonProps {
  columns: readonly TableSkeletonColumn[];
  rows?: number;
  rowClassName?: string;
}

export type MobileListSkeletonProps = ListSkeletonProps;

export interface SidebarListSkeletonProps {
  rows?: number;
  className?: string;
}

export interface PickRowsSkeletonProps {
  rows?: number;
  hasSpotLine?: boolean;
}

export interface BusinessDetailSkeletonProps {
  statTiles: number;
  statGridClassName: string;
  children: import("react").ReactNode;
}

export type DividedRowSkeletonLine = "title" | "subtitle" | "badges" | "detail";

export type DividedRowSkeletonTrailing = "button" | "iconButton" | "select" | "badge" | "text";

export interface DividedRowsSkeletonProps {
  rows?: number;
  leading?: "none" | "glyph" | "icon";
  lines?: readonly DividedRowSkeletonLine[];
  hasTitleBadge?: boolean;
  trailing?: readonly DividedRowSkeletonTrailing[];
  rowClassName?: string;
  className?: string;
}

export interface SettingsSectionSkeletonProps {
  fields?: number;
  hasDescription?: boolean;
  hasAction?: boolean;
  hasFieldDescriptions?: boolean;
  controlClassName?: string;
  fieldGridClassName?: string;
  children?: import("react").ReactNode;
}

export interface SettingsSectionsSkeletonProps {
  sections: readonly SettingsSectionSkeletonProps[];
  className?: string;
}

export interface TradeOfferDetailSkeletonProps {
  hasValueSummary?: boolean;
}

export interface CardReservationRequestSkeletonProps {
  requests?: number;
  cardsPerRequest?: number;
}

export interface HomeCardRailSkeletonProps {
  tileClassName: string;
  tileCount: number;
}

export interface TradeOfferListSkeletonProps {
  hasHeading?: boolean;
}

export interface ShareLinkListSkeletonProps {
  leadsWithBadges?: boolean;
}

export interface TradeOfferSideSkeletonProps {
  className?: string;
}

export interface StorageCardsSkeletonProps {
  viewMode: import("@/lib/interfaces/cards").CardViewMode;
  density: import("@/lib/interfaces/cards").CardGridDensity;
}

export interface StorageCheckListSkeletonProps {
  showLocation: boolean;
}
