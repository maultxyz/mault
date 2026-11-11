import {
  SHARE_LINK_TOKEN_PARAM,
  SHOP_CATALOG_PATH_PREFIX,
  SHOP_PHOTO_UPLOAD_FIELD,
  type BusinessSettingsResponse,
  type Result,
  type ShopCatalog,
  type ShopCatalogInput,
  type ShopPhoto,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut, unwrap } from "@/lib/api/client";
import type { ShopPhotoUpload } from "@/lib/interfaces/shop-catalogs";
import { WEB_URL } from "@/lib/constants/config";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const businessAccessQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["business", "settings", orgId] as const,
    queryFn: () =>
      unwrap(apiGet<Result<BusinessSettingsResponse>>("/api/business/settings")).then(
        (response) => response.access,
      ),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export const shopCatalogsQueryOptions = (orgId: string | null, enabled: boolean) =>
  queryOptions({
    queryKey: ["business", "shop-catalogs", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<ShopCatalog[]>>("/api/business/shop-catalogs")),
    enabled: !!orgId && enabled,
    staleTime: QUERY_STALE_MS,
  });

export function createShopCatalog(input: ShopCatalogInput): Promise<ShopCatalog> {
  return unwrap(apiPost<Result<ShopCatalog>>("/api/business/shop-catalogs", input));
}

export function updateShopCatalog(guid: string, input: ShopCatalogInput): Promise<ShopCatalog> {
  return unwrap(apiPut<Result<ShopCatalog>>(`/api/business/shop-catalogs/${guid}`, input));
}

export function resetShopCatalogLink(guid: string): Promise<ShopCatalog> {
  return unwrap(apiPost<Result<ShopCatalog>>(`/api/business/shop-catalogs/${guid}/reset-link`));
}

export function deleteShopCatalog(guid: string): Promise<unknown> {
  return unwrap(apiDelete<Result<unknown>>(`/api/business/shop-catalogs/${guid}`));
}

export function buildShopCatalogUrl(catalogGuid: string, token: string): string {
  return `${WEB_URL}${SHOP_CATALOG_PATH_PREFIX}/${catalogGuid}?${SHARE_LINK_TOKEN_PARAM}=${encodeURIComponent(token)}`;
}

export const shopPhotoQueryOptions = (orgId: string | null, enabled: boolean) =>
  queryOptions({
    queryKey: ["business", "shop-photo", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<ShopPhoto>>("/api/business/shop-photo")),
    enabled: !!orgId && enabled,
    staleTime: QUERY_STALE_MS,
  });

export function uploadShopPhoto(upload: ShopPhotoUpload): Promise<ShopPhoto> {
  const form = new FormData();
  form.append(SHOP_PHOTO_UPLOAD_FIELD, {
    uri: upload.uri,
    name: upload.fileName,
    type: upload.mimeType,
  } as unknown as Blob);
  return unwrap(apiPostForm<Result<ShopPhoto>>("/api/business/shop-photo", form));
}

export function removeShopPhoto(): Promise<ShopPhoto> {
  return unwrap(apiDelete<Result<ShopPhoto>>("/api/business/shop-photo"));
}
