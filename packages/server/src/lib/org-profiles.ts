import {
  EMPTY_PUBLIC_CARD_FILTERS,
  ORG_PROFILE_SHOWCASE_CARDS_MAX,
  buildShopCatalogLinkUrl,
  orgProfilePath,
  type OrgProfile,
  type OrgProfileInput,
  type OrgProfileSettings,
  type OrgProfileShopCatalogChoice,
  type OrgProfileShowcaseCard,
  type PublicOrgProfileShopCatalog,
  type ShortenerLink,
} from "@magic-vault/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { collectionCards, collections, orgProfiles, shopCatalogs } from "../db/schema";
import { SHARE_LINK_CACHE_MAX_ENTRIES, SHARED_STORAGE_READS_CACHE_TTL_MS } from "./constants/api-keys";
import { ORG_PROFILE_CACHE_MAX_ENTRIES, ORG_PROFILE_CACHE_TTL_MS } from "./constants/org-profiles";
import { getWebUrl } from "./constants/urls";
import type {
  OrgProfileRow,
  OrgProfileShortLinkChange,
  OrgProfileShowcaseRows,
  PublishedOrgProfile,
} from "./interfaces/org-profiles";
import { orgHasFeature } from "./plan-config";
import { loadOrgPricing } from "./price-source";
import { loadPublicCardGames, loadPublicCardPage } from "./public-card-browse";
import { orgProfileScope, shopCatalogScope } from "./share-link-scopes";
import { loadShopCatalogSources, shopCatalogLinkToken } from "./shop-catalogs";
import {
  deleteShortLinks,
  findShortLinkTargetPath,
  listCustomShortLinks,
  registerShortLinks,
  shortLinkUrlFor,
  shortLinksEnabled,
} from "./shortener-client";
import { integerArraySql, uuidArraySql } from "./sql-arrays";
import { createTtlCache } from "./ttl-cache";

const publishedOrgProfiles = createTtlCache<PublishedOrgProfile>({
  name: "orgProfiles.published",
  ttlMs: ORG_PROFILE_CACHE_TTL_MS,
  maxEntries: ORG_PROFILE_CACHE_MAX_ENTRIES,
});

export const orgProfileReadsCache = createTtlCache<unknown>({
  name: "orgProfiles.publicReads",
  ttlMs: SHARED_STORAGE_READS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

export function forgetOrgProfile(handle: string): void {
  publishedOrgProfiles.deleteWhere((key) => key === handle);
  orgProfileReadsCache.deleteWhere((key) => key.startsWith(`${handle}|`));
}

export function orgProfileShortTarget(handle: string): ShortenerLink {
  return { code: handle, targetPath: orgProfilePath(handle), expiresAt: null };
}

export async function syncOrgProfileShortLink({
  previous,
  next,
}: OrgProfileShortLinkChange): Promise<void> {
  const previousRegisteredHandle = previous?.isPublished ? previous.handle : null;
  if (
    previousRegisteredHandle &&
    (!next.isPublished || previousRegisteredHandle !== next.handle)
  ) {
    await deleteShortLinks([previousRegisteredHandle]);
  }
  if (next.isPublished) await registerShortLinks([orgProfileShortTarget(next.handle)]);
}

export async function isHandleFreeInShortener(handle: string): Promise<boolean> {
  if (!shortLinksEnabled()) return true;
  const targetPath = await findShortLinkTargetPath(handle);
  if (targetPath && targetPath !== orgProfilePath(handle)) return false;
  const customLinks = await listCustomShortLinks();
  return !customLinks.some((link) => link.code === handle);
}

export async function isHandleClaimedByOtherOrg(
  tx: Transaction,
  orgId: string,
  handle: string,
): Promise<boolean> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`org_profile_handle:${handle}`}))`);
  const [owner] = await tx
    .select({ orgId: orgProfiles.orgId })
    .from(orgProfiles)
    .where(eq(orgProfiles.handle, handle))
    .limit(1);
  return !!owner && owner.orgId !== orgId;
}

export async function isHandleUsedByAnyOrgProfile(handle: string): Promise<boolean> {
  const [row] = await db
    .select({ id: orgProfiles.id })
    .from(orgProfiles)
    .where(eq(orgProfiles.handle, handle.toLowerCase()))
    .limit(1);
  return !!row;
}

async function loadLiveShowcaseRows(
  runner: Transaction,
  orgId: string,
  collectionCardIds: number[],
): Promise<OrgProfileShowcaseRows> {
  if (collectionCardIds.length === 0) return { collectionCardIds: [], collectionIds: [] };
  const rows = await runner
    .select({ id: collectionCards.id, collectionId: collectionCards.collectionId })
    .from(collectionCards)
    .innerJoin(
      collections,
      and(eq(collections.id, collectionCards.collectionId), eq(collections.isDeleted, false)),
    )
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        sql`${collectionCards.id} = ANY(${integerArraySql(collectionCardIds)})`,
      ),
    );
  const collectionIdByCardId = new Map(rows.map((row) => [row.id, row.collectionId]));
  const liveCardIds = collectionCardIds.filter((id) => collectionIdByCardId.has(id));
  return {
    collectionCardIds: liveCardIds,
    collectionIds: [...new Set(liveCardIds.map((id) => collectionIdByCardId.get(id)!))],
  };
}

export async function resolveShowcaseCollectionCardIds(
  tx: Transaction,
  orgId: string,
  scanIds: string[],
): Promise<number[] | null> {
  const uniqueScanIds = [...new Set(scanIds.map((scanId) => scanId.toLowerCase()))];
  if (uniqueScanIds.length === 0) return [];
  const rows = await tx
    .select({ id: collectionCards.id, scanId: collectionCards.guid })
    .from(collectionCards)
    .innerJoin(
      collections,
      and(eq(collections.id, collectionCards.collectionId), eq(collections.isDeleted, false)),
    )
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        sql`${collectionCards.guid} = ANY(${uuidArraySql(uniqueScanIds)})`,
      ),
    );
  const idByScanId = new Map(rows.map((row) => [row.scanId?.toLowerCase(), row.id]));
  const ids = uniqueScanIds.map((scanId) => idByScanId.get(scanId));
  return ids.every((id): id is number => id !== undefined) ? ids : null;
}

export async function resolveShopCatalogIds(
  tx: Transaction,
  orgId: string,
  catalogGuids: string[],
): Promise<number[] | null> {
  const uniqueGuids = [...new Set(catalogGuids.map((guid) => guid.toLowerCase()))];
  if (uniqueGuids.length === 0) return [];
  if (!(await orgHasFeature(tx, orgId, "businessTools"))) return null;
  const rows = await tx
    .select({ id: shopCatalogs.id, guid: shopCatalogs.guid })
    .from(shopCatalogs)
    .where(
      and(
        eq(shopCatalogs.orgId, orgId),
        eq(shopCatalogs.isDeleted, false),
        sql`${shopCatalogs.guid} = ANY(${uuidArraySql(uniqueGuids)})`,
      ),
    );
  const idByGuid = new Map(rows.map((row) => [row.guid.toLowerCase(), row.id]));
  const ids = uniqueGuids.map((guid) => idByGuid.get(guid));
  return ids.every((id): id is number => id !== undefined) ? ids : null;
}

async function loadOrgShopCatalogRows(tx: Transaction, orgId: string) {
  if (!(await orgHasFeature(tx, orgId, "businessTools"))) return [];
  return tx
    .select()
    .from(shopCatalogs)
    .where(and(eq(shopCatalogs.orgId, orgId), eq(shopCatalogs.isDeleted, false)))
    .orderBy(asc(shopCatalogs.name), asc(shopCatalogs.id));
}

async function loadPublicProfileShopCatalogs(
  tx: Transaction,
  orgId: string,
  shopCatalogIds: number[],
): Promise<PublicOrgProfileShopCatalog[]> {
  if (shopCatalogIds.length === 0) return [];
  const rowsById = new Map((await loadOrgShopCatalogRows(tx, orgId)).map((row) => [row.id, row]));
  const catalogs: PublicOrgProfileShopCatalog[] = [];
  for (const id of shopCatalogIds) {
    const row = rowsById.get(id);
    if (!row) continue;
    const url = buildShopCatalogLinkUrl(getWebUrl(), {
      guid: row.guid,
      isPublic: row.isPublic,
      linkToken: row.isPublic
        ? null
        : await shopCatalogLinkToken(row.guid, row.orgId, row.shareLinkVersion),
      shortUrl: shortLinkUrlFor(row.shortCode),
    });
    if (!url) continue;
    const sources = await loadShopCatalogSources(
      tx,
      row.orgId,
      row.collectionIds,
      row.storageLocationIds,
    );
    const { cardCount, games } = await loadPublicCardGames(
      tx,
      shopCatalogScope({
        orgId: row.orgId,
        catalogGuid: row.guid,
        collectionIds: sources.collections.map((source) => source.id),
        storageLocationIds: sources.storageLocations.map((source) => source.id),
        showsPrices: row.showsPrices,
      }),
    );
    catalogs.push({ name: row.name, url, cardCount, games });
  }
  return catalogs;
}

async function loadShowcaseCards(
  tx: Transaction,
  row: OrgProfileRow,
): Promise<OrgProfileShowcaseCard[]> {
  const showcase = await loadLiveShowcaseRows(tx, row.orgId, row.showcaseCollectionCardIds);
  if (showcase.collectionCardIds.length === 0) return [];
  const page = await loadPublicCardPage(
    tx,
    orgProfileScope({ ...showcase, orgId: row.orgId, handle: row.handle, showsPrices: false }),
    {
      search: "",
      sort: "newest",
      gameKey: null,
      filters: EMPTY_PUBLIC_CARD_FILTERS,
      pageSize: ORG_PROFILE_SHOWCASE_CARDS_MAX,
      requestedPage: 1,
    },
    await loadOrgPricing(tx, row.orgId),
  );
  return page.cards.map((entry) => ({
    scanId: entry.scanId,
    name: entry.card.name,
    setCode: entry.card.set || null,
    imageUrl: entry.card.image?.normal ?? null,
  }));
}

export async function toOrgProfile(tx: Transaction, row: OrgProfileRow): Promise<OrgProfile> {
  const catalogGuidById = new Map(
    (await loadOrgShopCatalogRows(tx, row.orgId)).map((catalog) => [catalog.id, catalog.guid]),
  );
  return {
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    links: row.links,
    showcaseCards: await loadShowcaseCards(tx, row),
    shopCatalogGuids: row.shopCatalogIds.flatMap((id) => {
      const guid = catalogGuidById.get(id);
      return guid ? [guid] : [];
    }),
    showsPrices: row.showsPrices,
    isPublished: row.isPublished,
    shortUrl: row.isPublished ? shortLinkUrlFor(row.handle) : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function findOrgProfileRow(tx: Transaction, orgId: string) {
  return tx.query.orgProfiles.findFirst({ where: (t, { eq }) => eq(t.orgId, orgId) });
}

export async function loadOrgProfileSettings(
  tx: Transaction,
  orgId: string,
  canEdit: boolean,
): Promise<OrgProfileSettings> {
  const row = await findOrgProfileRow(tx, orgId);
  const shopCatalogChoices: OrgProfileShopCatalogChoice[] = (
    await loadOrgShopCatalogRows(tx, orgId)
  ).map((catalog) => ({ guid: catalog.guid, name: catalog.name, isPublic: catalog.isPublic }));
  return {
    profile: row ? await toOrgProfile(tx, row) : null,
    canEdit,
    shopCatalogChoices,
  };
}

export async function saveOrgProfileRow(
  tx: Transaction,
  orgId: string,
  input: OrgProfileInput,
  sourceIds: { showcaseCollectionCardIds: number[]; shopCatalogIds: number[] },
): Promise<OrgProfileRow> {
  const values = {
    handle: input.handle,
    displayName: input.displayName,
    bio: input.bio,
    links: input.links,
    showsPrices: input.showsPrices,
    isPublished: input.isPublished,
    showcaseCollectionCardIds: sourceIds.showcaseCollectionCardIds,
    shopCatalogIds: sourceIds.shopCatalogIds,
  };
  const [saved] = await tx
    .insert(orgProfiles)
    .values({ orgId, ...values })
    .onConflictDoUpdate({
      target: [orgProfiles.orgId],
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return saved;
}


async function loadPublishedOrgProfileUncached(
  handle: string,
): Promise<PublishedOrgProfile | null> {
  return db.transaction(async (tx) => {
    const row = await tx.query.orgProfiles.findFirst({
      where: (t, { and, eq }) => and(eq(t.handle, handle), eq(t.isPublished, true)),
    });
    if (!row) return null;
    const showcase = await loadLiveShowcaseRows(tx, row.orgId, row.showcaseCollectionCardIds);
    return {
      ...showcase,
      orgId: row.orgId,
      handle: row.handle,
      displayName: row.displayName,
      bio: row.bio,
      links: row.links,
      showsPrices: row.showsPrices,
      shopCatalogs: await loadPublicProfileShopCatalogs(tx, row.orgId, row.shopCatalogIds),
    };
  });
}

export async function loadPublishedOrgProfile(
  handle: string,
): Promise<PublishedOrgProfile | null> {
  const cached = publishedOrgProfiles.get(handle);
  if (cached) return cached;
  const profile = await loadPublishedOrgProfileUncached(handle);
  if (profile) publishedOrgProfiles.set(handle, profile);
  return profile;
}

export async function loadPublishedOrgProfileHandles(): Promise<string[]> {
  const rows = await db
    .select({ handle: orgProfiles.handle })
    .from(orgProfiles)
    .where(eq(orgProfiles.isPublished, true));
  return rows.map((row) => row.handle);
}
