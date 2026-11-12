import type { OrgShareLink } from "@magic-vault/shared";
export type ShareLinkKind = "collection" | "storage";


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

export type ShareLinkSheetView = { name: "links" } | { name: "new" } | { name: "link"; linkGuid: string };

export interface NewShareLinkFormProps {
  kind: ShareLinkKind;
  subjectGuid: string;
  onCreated: (createdLinkGuid: string | null) => void;
  onBack: () => void;
}

export interface SubjectShareLinksProps {
  kind: ShareLinkKind;
  subjectGuid: string;
  onSelect: (linkGuid: string) => void;
  onNew: () => void;
}
