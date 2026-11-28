import {
  DEFAULT_SHOP_CATALOG_ALLOWS_RESERVATIONS,
  DEFAULT_SHOP_CATALOG_RESERVATIONS_REQUIRE_ACCOUNT,
} from "./constants/card-reservations.constant";
import { DEFAULT_SHARE_LINK_SHOWS_PRICES } from "./constants/monitor-links.constant";
import { DEFAULT_SHOP_CATALOG_IS_PUBLIC } from "./constants/shop-catalogs.constant";
import { toCardReservationHoldDays } from "./card-reservations";
import type { ShopCatalogFormValues } from "./interfaces/form-schemas.interface";
import type { ShopCatalog } from "./interfaces/shop-catalogs.interface";

export function toShopCatalogFormValues(catalog: ShopCatalog | null): ShopCatalogFormValues {
  return {
    name: catalog?.name ?? "",
    showsPrices: catalog?.showsPrices ?? DEFAULT_SHARE_LINK_SHOWS_PRICES,
    isPublic: catalog?.isPublic ?? DEFAULT_SHOP_CATALOG_IS_PUBLIC,
    allowsReservations: catalog?.allowsReservations ?? DEFAULT_SHOP_CATALOG_ALLOWS_RESERVATIONS,
    reservationsRequireAccount:
      catalog?.reservationsRequireAccount ?? DEFAULT_SHOP_CATALOG_RESERVATIONS_REQUIRE_ACCOUNT,
    reservationHoldDays: toCardReservationHoldDays(catalog?.reservationHoldDays),
    collectionGuids: catalog?.collections.map((source) => source.guid) ?? [],
    storageLocationGuids: catalog?.storageLocations.map((source) => source.guid) ?? [],
  };
}
