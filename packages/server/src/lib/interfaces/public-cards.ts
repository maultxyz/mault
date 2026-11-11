import type { PublicCardFilters, PublicCardSort } from "@magic-vault/shared";
import type { Context } from "hono";
import type { AppEnv } from "../../middleware/auth";
import type { TtlCache } from "./public-api";

export interface PublicCardBrowseScope {
  orgId: string;
  collectionIds: number[];
  storageLocationIds: number[];
  inventoryOnly: boolean;
  showsPrices: boolean;
  readsCacheKey: string | null;
}

export interface PublicCardBrowseRouteOptions {
  resolveScope: (c: Context<AppEnv>) => Promise<PublicCardBrowseScope | null>;
  infoExtras?: (c: Context<AppEnv>) => Promise<Record<string, unknown>>;
  readsCache: TtlCache<unknown> | null;
}

export interface PublicCardsRequest {
  search: string;
  sort: PublicCardSort;
  gameKey: string | null;
  filters: PublicCardFilters;
  pageSize: number;
  requestedPage: number;
}

export interface PublicCardImageRow {
  id: number;
  captured_image_key: string | null;
  captured_image_data_url: string | null;
  captured_back_image_key: string | null;
  captured_back_image_data_url: string | null;
}
