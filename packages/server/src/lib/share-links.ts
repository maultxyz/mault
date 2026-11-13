import type { OrgShareLink, ShareLinkKind, ShareLinkPurpose } from "@magic-vault/shared";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { collections, shareLinks, storageLocations } from "../db/schema";
import { MONITOR_LINK_ISSUER, STORAGE_SHARE_LINK_ISSUER } from "./constants/auth";
import { ONE_MINUTE_MS } from "./constants/timing";
import type {
  IssueShareLinkInput,
  IssuedShareLink,
  RevokedShareLink,
} from "./interfaces/share-tokens";
import {
  allowsLongShareLinks,
  isOneHourShareLink,
  restrictedShareLinkLifetime,
} from "./share-link-policy";
import { signShareToken } from "./share-tokens";

const ISSUER_BY_KIND: Record<ShareLinkKind, string> = {
  collection: MONITOR_LINK_ISSUER,
  storage: STORAGE_SHARE_LINK_ISSUER,
};

function wholeSeconds(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

function signShareLinkRow(row: {
  guid: string;
  orgId: string;
  linkKind: string;
  subjectGuid: string;
  subjectVersion: number;
  purpose: string;
  showsPrices: boolean;
  issuedAt: Date;
  expiresAt: Date;
}): Promise<string> {
  return signShareToken({
    issuer: ISSUER_BY_KIND[row.linkKind as ShareLinkKind],
    linkGuid: row.guid,
    subjectGuid: row.subjectGuid,
    orgId: row.orgId,
    version: row.subjectVersion,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    showsPrices: row.showsPrices,
    purpose: row.purpose as ShareLinkPurpose,
  });
}

export async function issueShareLink(
  tx: Transaction,
  input: IssueShareLinkInput,
): Promise<IssuedShareLink> {
  const issuedAt = wholeSeconds(new Date());
  const expiresAt = new Date(issuedAt.getTime() + input.expiresInMinutes * ONE_MINUTE_MS);
  const [row] = await tx
    .insert(shareLinks)
    .values({
      orgId: input.orgId,
      linkKind: input.kind,
      collectionId: input.kind === "collection" ? input.subjectId : null,
      storageLocationId: input.kind === "storage" ? input.subjectId : null,
      subjectGuid: input.subjectGuid,
      subjectVersion: input.subjectVersion,
      purpose: input.purpose,
      showsPrices: input.showsPrices,
      issuedAt,
      expiresAt,
      createdByUserId: input.createdByUserId,
    })
    .returning();
  return { guid: row.guid, token: await signShareLinkRow(row), expiresAt };
}

export async function isShareLinkActive(orgId: string, linkGuid: string): Promise<boolean> {
  const row = await db.query.shareLinks.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(eq(t.guid, linkGuid), eq(t.orgId, orgId), isNull(t.revokedAt)),
    columns: { id: true },
  });
  return !!row;
}

export async function listSubjectShareLinks(
  tx: Transaction,
  orgId: string,
  subjectGuid: string,
): Promise<OrgShareLink[]> {
  const rows = await tx
    .select({
      link: shareLinks,
      collectionName: collections.name,
      locationName: storageLocations.name,
    })
    .from(shareLinks)
    .leftJoin(
      collections,
      and(
        eq(collections.id, shareLinks.collectionId),
        eq(collections.isDeleted, false),
        eq(collections.monitorLinkVersion, shareLinks.subjectVersion),
      ),
    )
    .leftJoin(
      storageLocations,
      and(
        eq(storageLocations.id, shareLinks.storageLocationId),
        eq(storageLocations.isDeleted, false),
        eq(storageLocations.shareLinkVersion, shareLinks.subjectVersion),
      ),
    )
    .where(
      and(
        eq(shareLinks.orgId, orgId),
        eq(shareLinks.subjectGuid, subjectGuid),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, sql`now()`),
        or(sql`${collections.id} is not null`, sql`${storageLocations.id} is not null`),
      ),
    )
    .orderBy(desc(shareLinks.issuedAt));
  const allowsLongLinks = await allowsLongShareLinks(tx, orgId);
  const links: OrgShareLink[] = [];
  for (const { link, collectionName, locationName } of rows) {
    const purpose = link.purpose as ShareLinkPurpose;
    const expiresAt = isOneHourShareLink(purpose, allowsLongLinks)
      ? restrictedShareLinkLifetime(link.issuedAt, link.expiresAt)?.expiresAt
      : link.expiresAt;
    if (!expiresAt) continue;
    links.push({
      guid: link.guid,
      kind: link.linkKind as ShareLinkKind,
      subjectGuid: link.subjectGuid,
      subjectName: collectionName ?? locationName ?? "",
      purpose,
      showsPrices: link.showsPrices,
      createdAt: link.issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      token: await signShareLinkRow(link),
    });
  }
  return links;
}

export async function revokeShareLink(
  tx: Transaction,
  orgId: string,
  linkGuid: string,
): Promise<RevokedShareLink | null> {
  const [row] = await tx
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(shareLinks.guid, linkGuid), eq(shareLinks.orgId, orgId), isNull(shareLinks.revokedAt)),
    )
    .returning({ linkKind: shareLinks.linkKind, subjectGuid: shareLinks.subjectGuid });
  return row ? { kind: row.linkKind as ShareLinkKind, subjectGuid: row.subjectGuid } : null;
}

export async function revokeShareLinksForSubject(
  tx: Transaction,
  orgId: string,
  subjectGuid: string,
): Promise<void> {
  await tx
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(shareLinks.orgId, orgId),
        eq(shareLinks.subjectGuid, subjectGuid),
        isNull(shareLinks.revokedAt),
      ),
    );
}
