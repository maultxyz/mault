import {
  RESTRICTED_SHARE_LINK_MINUTES,
  SHARE_LINK_PURPOSES,
  type ShareLinkPurpose,
} from "@magic-vault/shared";
import { db, type Transaction } from "../db";
import { MINUTES_PER_DAY, ONE_MINUTE_MS } from "./constants/timing";
import type { ShareLinkLifetime } from "./interfaces/share-tokens";
import { orgHasFeature } from "./plan-config";

export function allowsLongShareLinks(
  runner: Transaction | null,
  orgId: string,
): Promise<boolean> {
  return runner
    ? orgHasFeature(runner, orgId, "longShareLinks")
    : db.transaction((tx) => orgHasFeature(tx, orgId, "longShareLinks"));
}

export function parseShareLinkPurpose(value: unknown): ShareLinkPurpose | null {
  if (value === undefined || value === null) return "view";
  return (SHARE_LINK_PURPOSES as readonly unknown[]).includes(value)
    ? (value as ShareLinkPurpose)
    : null;
}

export function isOneHourShareLink(
  purpose: ShareLinkPurpose,
  allowsLongLinks: boolean,
): boolean {
  return purpose === "trade" || !allowsLongLinks;
}

export function shareLinkExpiresInMinutes(
  purpose: ShareLinkPurpose,
  allowsLongLinks: boolean,
  requestedDays: number,
): number {
  return isOneHourShareLink(purpose, allowsLongLinks)
    ? RESTRICTED_SHARE_LINK_MINUTES
    : requestedDays * MINUTES_PER_DAY;
}

export function restrictedShareLinkLifetime(
  issuedAt: Date,
  expiresAt: Date,
): ShareLinkLifetime | null {
  const restrictedEnd = new Date(
    issuedAt.getTime() + RESTRICTED_SHARE_LINK_MINUTES * ONE_MINUTE_MS,
  );
  if (restrictedEnd.getTime() <= Date.now()) return null;
  return { expiresAt: restrictedEnd < expiresAt ? restrictedEnd : expiresAt };
}

export async function shareLinkLifetime(
  orgId: string,
  purpose: ShareLinkPurpose,
  issuedAt: Date,
  expiresAt: Date,
): Promise<ShareLinkLifetime | null> {
  if (purpose === "view" && (await allowsLongShareLinks(null, orgId))) {
    return { expiresAt };
  }
  return restrictedShareLinkLifetime(issuedAt, expiresAt);
}
