import {
  SHARED_STORAGE_PATH_PREFIX,
  SHARE_LINK_TOKEN_PARAM,
  SHOP_CATALOG_PATH_PREFIX,
  WATCH_PATH_PREFIX,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { shareLinks, shopCatalogs } from "../db/schema";
import { signShareLinkRow } from "./share-links";
import { shopCatalogLinkToken } from "./shop-catalogs";

function pathWithToken(path: string, token: string | null): string {
  return token ? `${path}?${new URLSearchParams({ [SHARE_LINK_TOKEN_PARAM]: token })}` : path;
}

export async function resolveShortLinkPath(shortCode: string): Promise<string | null> {
  const [shareLink] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.shortCode, shortCode))
    .limit(1);
  if (shareLink) {
    const prefix =
      shareLink.linkKind === "storage" ? SHARED_STORAGE_PATH_PREFIX : WATCH_PATH_PREFIX;
    return pathWithToken(`${prefix}/${shareLink.subjectGuid}`, await signShareLinkRow(shareLink));
  }
  const [catalog] = await db
    .select({
      guid: shopCatalogs.guid,
      orgId: shopCatalogs.orgId,
      isPublic: shopCatalogs.isPublic,
      shareLinkVersion: shopCatalogs.shareLinkVersion,
    })
    .from(shopCatalogs)
    .where(and(eq(shopCatalogs.shortCode, shortCode), eq(shopCatalogs.isDeleted, false)))
    .limit(1);
  if (!catalog) return null;
  const path = `${SHOP_CATALOG_PATH_PREFIX}/${catalog.guid}`;
  if (catalog.isPublic) return path;
  return pathWithToken(
    path,
    await shopCatalogLinkToken(catalog.guid, catalog.orgId, catalog.shareLinkVersion),
  );
}
