import {
  DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
  type CardShareLink,
  type SharedCardLink,
} from "@magic-vault/shared";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { collectionCards, collections, shareLinks } from "../db/schema";
import { CARD_SHARE_LINK_ISSUER } from "./constants/auth";
import {
  SHARE_LINK_CACHE_MAX_ENTRIES,
  SHARE_LINK_CLAIMS_CACHE_TTL_MS,
} from "./constants/api-keys";
import {
  CARD_SHARE_LINK_LIFETIME_DAYS,
  CARD_SHARE_LINK_SHOWS_PRICES,
  CARD_SHARE_LINK_SUBJECT_VERSION,
} from "./constants/card-share-links";
import { MINUTES_PER_DAY } from "./constants/timing";
import type { CardShareLinkClaims } from "./interfaces/share-tokens";
import { issueShareLink, signShareLinkRow } from "./share-links";
import { verifyShareToken } from "./share-tokens";
import { shortLinkUrlFor } from "./shortener-client";
import { createTtlCache } from "./ttl-cache";

const verifiedCardShareLinks = createTtlCache<CardShareLinkClaims>({
  ttlMs: SHARE_LINK_CLAIMS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

export async function verifyCardShareLink(token: string): Promise<CardShareLinkClaims | null> {
  const cached = verifiedCardShareLinks.get(token);
  if (cached) return cached;
  const claims = await loadCardShareLinkClaims(token);
  if (claims) verifiedCardShareLinks.set(token, claims);
  return claims;
}

export function forgetVerifiedCardShareLinks(linkGuid: string): void {
  verifiedCardShareLinks.deleteWhere(
    (token) => verifiedCardShareLinks.get(token)?.linkGuid === linkGuid,
  );
}

async function loadCardShareLinkClaims(token: string): Promise<CardShareLinkClaims | null> {
  const verified = await verifyShareToken(CARD_SHARE_LINK_ISSUER, token);
  if (!verified?.linkGuid) return null;
  const linkGuid = verified.linkGuid;
  const link = await db.query.shareLinks.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(
        eq(t.guid, linkGuid),
        eq(t.orgId, verified.orgId),
        eq(t.linkKind, "card"),
        isNull(t.revokedAt),
      ),
    columns: { collectionCardId: true },
  });
  const collectionCardId = link?.collectionCardId;
  if (!collectionCardId) return null;
  const card = await db.query.collectionCards.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, collectionCardId), eq(t.orgId, verified.orgId)),
    columns: { id: true, guid: true, collectionId: true, cardName: true },
  });
  if (!card?.guid) return null;
  const collection = await db.query.collections.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, card.collectionId), eq(t.isDeleted, false)),
    columns: { id: true },
  });
  if (!collection) return null;
  return {
    linkGuid,
    collectionCardId: card.id,
    scanId: card.guid,
    collectionId: card.collectionId,
    cardName: card.cardName ?? "",
    orgId: verified.orgId,
    showsPrices: verified.showsPrices,
  };
}

export async function findOrIssueCardShareLink(
  tx: Transaction,
  orgId: string,
  scanId: string,
  createdByUserId: string,
): Promise<CardShareLink | null> {
  const card = await tx.query.collectionCards.findFirst({
    where: (t, { and, eq }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
    columns: { id: true },
  });
  if (!card) return null;
  const [existing] = await tx
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.orgId, orgId),
        eq(shareLinks.linkKind, "card"),
        eq(shareLinks.collectionCardId, card.id),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(shareLinks.issuedAt))
    .limit(1);
  if (existing) {
    return {
      guid: existing.guid,
      token: await signShareLinkRow(existing),
      shortCode: existing.shortCode,
      shortUrl: shortLinkUrlFor(existing.shortCode),
      expiresAt: existing.expiresAt.toISOString(),
    };
  }
  const issued = await issueShareLink(tx, {
    orgId,
    kind: "card",
    subjectId: card.id,
    subjectGuid: scanId,
    subjectVersion: CARD_SHARE_LINK_SUBJECT_VERSION,
    purpose: "view",
    showsPrices: CARD_SHARE_LINK_SHOWS_PRICES,
    requiresGuestContact: DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
    expiresInMinutes: CARD_SHARE_LINK_LIFETIME_DAYS * MINUTES_PER_DAY,
    createdByUserId,
  });
  return {
    guid: issued.guid,
    token: issued.token,
    shortCode: issued.shortCode,
    shortUrl: issued.shortUrl,
    expiresAt: issued.expiresAt.toISOString(),
  };
}

export async function listCollectionCardShareLinks(
  tx: Transaction,
  orgId: string,
  collectionGuid: string,
): Promise<SharedCardLink[]> {
  const rows = await tx
    .select({
      link: shareLinks,
      scanId: collectionCards.guid,
      cardName: collectionCards.cardName,
      setCode: collectionCards.cardSet,
    })
    .from(shareLinks)
    .innerJoin(
      collectionCards,
      and(
        eq(collectionCards.id, shareLinks.collectionCardId),
        eq(collectionCards.orgId, shareLinks.orgId),
      ),
    )
    .innerJoin(
      collections,
      and(
        eq(collections.id, collectionCards.collectionId),
        eq(collections.guid, collectionGuid),
        eq(collections.isDeleted, false),
      ),
    )
    .where(
      and(
        eq(shareLinks.orgId, orgId),
        eq(shareLinks.linkKind, "card"),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(shareLinks.issuedAt));
  return Promise.all(
    rows.map(async ({ link, scanId, cardName, setCode }) => ({
      guid: link.guid,
      kind: "card" as const,
      subjectGuid: link.subjectGuid,
      scanId: scanId ?? link.subjectGuid,
      cardName: cardName ?? "",
      setCode,
      createdAt: link.issuedAt.toISOString(),
      token: await signShareLinkRow(link),
      shortCode: link.shortCode,
      shortUrl: shortLinkUrlFor(link.shortCode),
    })),
  );
}
