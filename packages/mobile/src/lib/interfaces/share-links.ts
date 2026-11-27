import type { PublicCardFacets, PublicCardFilters, PublicCardSort } from "@magic-vault/shared";
import type { ShareLinkKind, ShareLinkPurpose } from "@magic-vault/shared";
import type { OrgShareLink } from "@magic-vault/shared";
export type { ShareLinkKind };


export interface ShareLinkQrProps {
  url: string;
  expiresAt: string;
}

export interface ExistingShareLinkProps {
  linkGuid: string;
  subjectGuid: string;
  onClose: () => void;
}

export interface ShareLinkListProps {
  links: OrgShareLink[];
  onSelect: (link: OrgShareLink) => void;
  onRevoke: (link: OrgShareLink) => void;
}

export interface SharedCardLinksProps {
  collectionGuid: string;
}

export type ShareLinkSheetTab = "links" | "cards";

export type ShareLinkSheetView = { name: "links" } | { name: "new" } | { name: "link"; linkGuid: string };

export interface NewShareLinkFormProps {
  kind: ShareLinkKind;
  subjectGuid: string;
  initialPurpose?: ShareLinkPurpose;
  onCreated: (createdLinkGuid: string | null) => void;
  onBack: () => void;
}

export interface SubjectShareLinksProps {
  kind: ShareLinkKind;
  subjectGuid: string;
  onSelect: (linkGuid: string) => void;
  onNew: () => void;
  showsCreatedInListNotice: boolean;
}

export interface SharedLinkFilterSheetProps {
  visible: boolean;
  facets: PublicCardFacets | undefined;
  showsPrices: boolean;
  sort: PublicCardSort;
  filters: PublicCardFilters;
  onSortChange: (sort: PublicCardSort) => void;
  onFiltersChange: (filters: PublicCardFilters) => void;
  onClose: () => void;
}

export interface TradeLinkCardsQueryOptions {
  sort?: PublicCardSort;
  filters?: PublicCardFilters;
}
