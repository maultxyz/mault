import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "@/lib/api/client";
import { fetchPublicCards, publicCardsKeys } from "@/features/public-cards/api/public-cards";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import {
  SHARE_LINK_TOKEN_PARAM,
  SHOP_CATALOG_GUID_PARAM,
  SHOP_CATALOG_PATH_PREFIX,
  SHOP_PHOTO_UPLOAD_FIELD,
  type Result,
  type ShopCatalog,
  type ShopCatalogInfo,
  type ShopCatalogInput,
  type ShopPhoto,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const shopCatalogKeys = {
  list: (orgId: string | undefined) => ["shop-catalogs", orgId] as const,
  photo: (orgId: string | undefined) => ["shop-photo", orgId] as const,
};

export const shopCatalogsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: shopCatalogKeys.list(orgId),
    queryFn: async () => {
      const result = await apiGet<Result<ShopCatalog[]>>(
        "/api/business/shop-catalogs",
      );
      if (!result.success) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

export function createShopCatalog(
  input: ShopCatalogInput,
): Promise<Result<ShopCatalog>> {
  return apiPost<Result<ShopCatalog>>("/api/business/shop-catalogs", input);
}

export function updateShopCatalog(
  guid: string,
  input: ShopCatalogInput,
): Promise<Result<ShopCatalog>> {
  return apiPut<Result<ShopCatalog>>(`/api/business/shop-catalogs/${guid}`, input);
}

export function resetShopCatalogLink(guid: string): Promise<Result<ShopCatalog>> {
  return apiPost<Result<ShopCatalog>>(
    `/api/business/shop-catalogs/${guid}/reset-link`,
    {},
  );
}

export function deleteShopCatalog(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/business/shop-catalogs/${guid}`);
}

export function buildShopCatalogUrl(catalog: ShopCatalog): string | null {
  const base = `${window.location.origin}${SHOP_CATALOG_PATH_PREFIX}/${catalog.guid}`;
  if (catalog.isPublic) return base;
  if (!catalog.linkToken) return null;
  const params = new URLSearchParams({ [SHARE_LINK_TOKEN_PARAM]: catalog.linkToken });
  return `${base}?${params}`;
}

export const publicShopCatalogQueryOptions = (source: PublicCardsSource) =>
  queryOptions({
    queryKey: publicCardsKeys.info(source),
    queryFn: () =>
      fetchPublicCards<ShopCatalogInfo>(
        source.basePath,
        "",
        new URLSearchParams(source.linkParams),
      ),
    retry: false,
  });

export function shopCatalogSource(
  catalogGuid: string,
  token: string | null,
): PublicCardsSource {
  return {
    basePath: PUBLIC_CARDS_SOURCE_PATHS.catalog,
    linkParams: token ? { token } : { [SHOP_CATALOG_GUID_PARAM]: catalogGuid },
  };
}

export const shopPhotoQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: shopCatalogKeys.photo(orgId),
    queryFn: async () => {
      const result = await apiGet<Result<ShopPhoto>>("/api/business/shop-photo");
      if (!result.success) throw new Error(result.message);
      return result.data ?? { url: null };
    },
    enabled: !!orgId,
  });

export function uploadShopPhoto(photo: File): Promise<Result<ShopPhoto>> {
  const form = new FormData();
  form.append(SHOP_PHOTO_UPLOAD_FIELD, photo);
  return apiPostForm<Result<ShopPhoto>>("/api/business/shop-photo", form);
}

export function removeShopPhoto(): Promise<Result<ShopPhoto>> {
  return apiDelete<Result<ShopPhoto>>("/api/business/shop-photo");
}
