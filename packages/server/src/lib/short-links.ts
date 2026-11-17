import { shopCatalogPath, storageLabelPath, type ShortenerLink } from "@magic-vault/shared";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { shareLinks, shopCatalogs, storageLocations } from "../db/schema";
import {
  SHORT_LINK_STARTUP_SYNC_ATTEMPTS,
  SHORT_LINK_STARTUP_SYNC_RETRY_MS,
} from "./constants/short-links";
import type {
  ShopCatalogShortTargetRow,
  StorageLabelShortTargetRow,
} from "./interfaces/short-links";
import { shareLinkShortTarget } from "./share-links";
import { shopCatalogLinkToken } from "./shop-catalogs";
import {
  findShortLinkTargetPath,
  registerShortLinks,
  shortLinksEnabled,
} from "./shortener-client";

export async function shopCatalogShortTarget(
  catalog: ShopCatalogShortTargetRow,
): Promise<ShortenerLink> {
  const token = catalog.isPublic
    ? null
    : await shopCatalogLinkToken(catalog.guid, catalog.orgId, catalog.shareLinkVersion);
  return { code: catalog.shortCode, targetPath: shopCatalogPath(catalog.guid, token), expiresAt: null };
}

export function storageLabelShortTarget(location: StorageLabelShortTargetRow): ShortenerLink {
  return {
    code: location.labelShortCode,
    targetPath: storageLabelPath({ locationGuid: location.guid, orgId: location.orgId }),
    expiresAt: null,
  };
}

export async function resolveShortLinkPath(shortCode: string): Promise<string | null> {
  return findShortLinkTargetPath(shortCode);
}

async function loadLiveShortTargets(): Promise<ShortenerLink[]> {
  const liveShareLinks = await db
    .select()
    .from(shareLinks)
    .where(and(isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, sql`now()`)));
  const liveCatalogs = await db
    .select({
      guid: shopCatalogs.guid,
      orgId: shopCatalogs.orgId,
      isPublic: shopCatalogs.isPublic,
      shareLinkVersion: shopCatalogs.shareLinkVersion,
      shortCode: shopCatalogs.shortCode,
    })
    .from(shopCatalogs)
    .where(eq(shopCatalogs.isDeleted, false));
  const storageLabels = await db
    .select({
      guid: storageLocations.guid,
      orgId: storageLocations.orgId,
      labelShortCode: storageLocations.labelShortCode,
    })
    .from(storageLocations);
  return [
    ...(await Promise.all(liveShareLinks.map(shareLinkShortTarget))),
    ...(await Promise.all(liveCatalogs.map(shopCatalogShortTarget))),
    ...storageLabels.map((location) =>
      storageLabelShortTarget({ ...location, guid: location.guid! }),
    ),
  ];
}

export function startShortLinkStartupSync(): void {
  if (!shortLinksEnabled()) return;
  void (async () => {
    const targets = await loadLiveShortTargets();
    for (let attempt = 1; attempt <= SHORT_LINK_STARTUP_SYNC_ATTEMPTS; attempt++) {
      try {
        await registerShortLinks(targets);
        console.log(`[short-links] Registered ${targets.length} short links with the shortener.`);
        return;
      } catch (error) {
        console.warn(`[short-links] Shortener not ready (attempt ${attempt}):`, error);
        await new Promise((resolve) => setTimeout(resolve, SHORT_LINK_STARTUP_SYNC_RETRY_MS));
      }
    }
    console.error("[short-links] Gave up registering short links with the shortener.");
  })().catch((error) => console.error("[short-links] Startup sync failed:", error));
}
