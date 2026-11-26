import {
  EMPTY_CARD_FILTERS,
  type CollectionCardsQuery,
  type OrgProfileLinkKind,
} from "@magic-vault/shared";
import {
  IconBrandBluesky,
  IconBrandDiscord,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandTwitch,
  IconBrandX,
  IconBrandYoutube,
  IconBuildingStore,
  IconCards,
  IconDeviceTv,
  IconLink,
  IconShoppingBag,
  IconWorld,
} from "@tabler/icons-react";
import type { SettingsSectionSkeletonProps } from "@/lib/interfaces/skeletons";
import type { ComponentType } from "react";

export const ORG_PROFILE_SETTINGS_QUERY_KEY = "org-profile";
export const ORG_PROFILE_ROUTE_SEGMENT_PARAM = "profileSegment";
export const ORG_PROFILE_ROUTE_PATH = `/:${ORG_PROFILE_ROUTE_SEGMENT_PARAM}`;
export const ORG_PROFILE_PUBLIC_SHOWCASE_PAGE = 1;
export const ORG_PROFILE_PICKER_PAGE_SIZE = 24;
export const ORG_PROFILE_PICKER_SEARCH_MAX_LENGTH = 100;
export const ORG_PROFILE_PICKER_SKELETON_COUNT = 12;
export const ORG_PROFILE_SKELETON_LINK_COUNT = 3;
export const ORG_PROFILE_SKELETON_SHOWCASE_COUNT = 6;
export const DEFAULT_ORG_PROFILE_LINK_KIND: OrgProfileLinkKind = "website";

export const ORG_PROFILE_PICKER_BASE_QUERY: CollectionCardsQuery = {
  search: "",
  sort: null,
  filters: EMPTY_CARD_FILTERS,
  grouped: false,
};

export const ORG_PROFILE_LINK_KIND_ICONS: Record<
  OrgProfileLinkKind,
  ComponentType<{ className?: string }>
> = {
  website: IconWorld,
  tcgplayer: IconCards,
  cardmarket: IconBuildingStore,
  ebay: IconShoppingBag,
  whatnot: IconDeviceTv,
  instagram: IconBrandInstagram,
  tiktok: IconBrandTiktok,
  youtube: IconBrandYoutube,
  x: IconBrandX,
  bluesky: IconBrandBluesky,
  facebook: IconBrandFacebook,
  twitch: IconBrandTwitch,
  discord: IconBrandDiscord,
  other: IconLink,
};

export const ORG_PROFILE_SETTINGS_SKELETON_SECTIONS: readonly SettingsSectionSkeletonProps[] = [
  { fields: 1, hasDescription: false },
  { fields: 1 },
  { fields: 2 },
  { fields: 2, hasAction: true },
  { fields: 2, hasAction: true },
  { fields: 1, hasDescription: false },
];
