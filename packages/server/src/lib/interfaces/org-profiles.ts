import type { OrgProfileLink, PublicOrgProfileShopCatalog } from "@magic-vault/shared";
import type { orgProfiles } from "../../db/schema";

export type OrgProfileRow = typeof orgProfiles.$inferSelect;

export interface OrgProfileShowcaseRows {
  collectionCardIds: number[];
  collectionIds: number[];
}

export interface PublishedOrgProfile extends OrgProfileShowcaseRows {
  orgId: string;
  handle: string;
  displayName: string;
  bio: string;
  links: OrgProfileLink[];
  showsPrices: boolean;
  shopCatalogs: PublicOrgProfileShopCatalog[];
}

export interface OrgProfileShortLinkChange {
  previous: Pick<OrgProfileRow, "handle" | "isPublished"> | null;
  next: Pick<OrgProfileRow, "handle" | "isPublished">;
}

export interface OrgProfileScopeSource extends OrgProfileShowcaseRows {
  orgId: string;
  handle: string;
  showsPrices: boolean;
}
