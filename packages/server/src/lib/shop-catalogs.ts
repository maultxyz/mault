import type { ShopCatalogSource } from "@magic-vault/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { collections, storageLocations } from "../db/schema";
import { isBusinessToolsAllowed } from "./business-access";
import { SHOP_CATALOG_ISSUER } from "./constants/auth";
import {
  SHARE_LINK_CACHE_MAX_ENTRIES,
  SHARE_LINK_CLAIMS_CACHE_TTL_MS,
  SHARED_STORAGE_READS_CACHE_TTL_MS,
} from "./constants/api-keys";
import type { ShopCatalogSourceRows } from "./interfaces/shop-catalogs";
import type { ShopCatalogClaims } from "./interfaces/share-tokens";
import {
  isShareTokenConfigured,
  signRevocableShareToken,
  verifyRevocableShareToken,
} from "./share-tokens";
import { createTtlCache } from "./ttl-cache";

const verifiedShopCatalogLinks = createTtlCache<ShopCatalogClaims>({
  ttlMs: SHARE_LINK_CLAIMS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

export const shopCatalogReadsCache = createTtlCache<unknown>({
  ttlMs: SHARED_STORAGE_READS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

export function forgetShopCatalogLinks(catalogGuid: string): void {
  verifiedShopCatalogLinks.deleteWhere(
    (token) => verifiedShopCatalogLinks.get(token)?.catalogGuid === catalogGuid,
  );
  shopCatalogReadsCache.deleteWhere((key) => key.startsWith(`${catalogGuid}|`));
}

export function forgetShopCatalogReadsForOrg(orgId: string): void {
  shopCatalogReadsCache.deleteWhere((key) => key.split("|")[1] === orgId);
}

export async function shopCatalogLinkToken(
  catalogGuid: string,
  orgId: string,
  version: number,
): Promise<string | null> {
  if (!isShareTokenConfigured()) return null;
  return signRevocableShareToken({
    issuer: SHOP_CATALOG_ISSUER,
    subjectGuid: catalogGuid,
    orgId,
    version,
  });
}

export async function verifyShopCatalogLink(
  token: string,
): Promise<ShopCatalogClaims | null> {
  const cached = verifiedShopCatalogLinks.get(token);
  if (cached) return cached;
  const claims = await loadShopCatalogClaims(token);
  if (claims) verifiedShopCatalogLinks.set(token, claims);
  return claims;
}

async function loadShopCatalogClaims(
  token: string,
): Promise<ShopCatalogClaims | null> {
  const verified = await verifyRevocableShareToken(SHOP_CATALOG_ISSUER, token);
  if (!verified) return null;
  return db.transaction(async (tx) => {
    const catalog = await tx.query.shopCatalogs.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.guid, verified.subjectGuid),
          eq(t.orgId, verified.orgId),
          eq(t.isDeleted, false),
        ),
    });
    if (!catalog || catalog.shareLinkVersion !== verified.version) return null;
    if (!(await isBusinessToolsAllowed(tx, catalog.orgId))) return null;
    const sources = await loadShopCatalogSources(
      tx,
      catalog.orgId,
      catalog.collectionIds,
      catalog.storageLocationIds,
    );
    return {
      catalogGuid: catalog.guid,
      catalogId: catalog.id,
      orgId: catalog.orgId,
      name: catalog.name,
      collectionIds: sources.collections.map((source) => source.id),
      storageLocationIds: sources.storageLocations.map((source) => source.id),
      showsPrices: catalog.showsPrices,
    };
  });
}

export async function loadShopCatalogSources(
  runner: Transaction,
  orgId: string,
  collectionIds: number[],
  storageLocationIds: number[],
): Promise<ShopCatalogSourceRows> {
  const collectionRows =
    collectionIds.length === 0
      ? []
      : await runner
          .select({ id: collections.id, guid: collections.guid, name: collections.name })
          .from(collections)
          .where(
            and(
              inArray(collections.id, collectionIds),
              eq(collections.orgId, orgId),
              eq(collections.isDeleted, false),
            ),
          )
          .orderBy(asc(collections.name));
  const locationRows =
    storageLocationIds.length === 0
      ? []
      : await runner
          .select({
            id: storageLocations.id,
            guid: storageLocations.guid,
            name: storageLocations.name,
          })
          .from(storageLocations)
          .where(
            and(
              inArray(storageLocations.id, storageLocationIds),
              eq(storageLocations.orgId, orgId),
              eq(storageLocations.isDeleted, false),
            ),
          )
          .orderBy(asc(storageLocations.name));
  return {
    collections: collectionRows.flatMap((row) =>
      row.guid ? [{ id: row.id, guid: row.guid, name: row.name }] : [],
    ),
    storageLocations: locationRows.flatMap((row) =>
      row.guid ? [{ id: row.id, guid: row.guid, name: row.name }] : [],
    ),
  };
}

export function toShopCatalogSources(
  rows: ShopCatalogSourceRows[keyof ShopCatalogSourceRows],
): ShopCatalogSource[] {
  return rows.map(({ guid, name }) => ({ guid, name }));
}
