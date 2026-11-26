import type { z } from "zod";
import type {
  ORG_PROFILE_LINK_KINDS,
  ORG_PROFILE_SAVE_ERROR_CODES,
} from "../constants/org-profiles.constant";
import type { orgProfileFormSchema, orgProfileLinkSchema } from "../schemas/org-profiles.schema";
import type { PublicCardBrowseInfo, PublicCardGame } from "./public-cards.interface";
import type { Result } from "./result.interface";

export type OrgProfileLinkKind = (typeof ORG_PROFILE_LINK_KINDS)[number];

export type OrgProfileLink = z.output<typeof orgProfileLinkSchema>;

export type OrgProfileFormValues = z.input<typeof orgProfileFormSchema>;

export type OrgProfileInput = z.output<typeof orgProfileFormSchema>;

export interface OrgProfileShowcaseCard {
  scanId: string;
  name: string;
  setCode: string | null;
  imageUrl: string | null;
}

export interface OrgProfileShopCatalogChoice {
  guid: string;
  name: string;
  isPublic: boolean;
}

export interface OrgProfile {
  handle: string;
  displayName: string;
  bio: string;
  links: OrgProfileLink[];
  showcaseCards: OrgProfileShowcaseCard[];
  shopCatalogGuids: string[];
  showsPrices: boolean;
  isPublished: boolean;
  shortUrl: string | null;
  updatedAt: string;
}

export interface OrgProfileSettings {
  profile: OrgProfile | null;
  canEdit: boolean;
  shopCatalogChoices: OrgProfileShopCatalogChoice[];
}

export type OrgProfileSaveErrorCode = (typeof ORG_PROFILE_SAVE_ERROR_CODES)[number];

export interface OrgProfileSaveResult extends Result<OrgProfile> {
  errorCode?: OrgProfileSaveErrorCode;
}

export interface PublicOrgProfileShopCatalog {
  name: string;
  url: string;
  cardCount: number;
  games: PublicCardGame[];
}

export interface PublicOrgProfileInfo extends PublicCardBrowseInfo {
  handle: string;
  displayName: string;
  bio: string;
  links: OrgProfileLink[];
  shopCatalogs: PublicOrgProfileShopCatalog[];
}

export interface ShareableOrgProfile {
  handle: string;
  shortUrl: string | null;
}
