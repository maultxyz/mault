import {
  defaultMonitorLinkExpiryDays,
  longestMonitorLinkExpiryDays,
  MONITOR_LINK_EXPIRY_DAYS_MAX,
  SHARE_LINK_PURPOSES,
  type ShareLinkLengths,
  type ShareLinkPurpose,
} from "@magic-vault/shared";
import { db, type Transaction } from "../db";
import { MINUTES_PER_HOUR } from "./constants/share-link-lengths";
import { MINUTES_PER_DAY, ONE_MINUTE_MS } from "./constants/timing";
import type { ShareLinkLifetime } from "./interfaces/share-tokens";
import { orgHasFeature } from "./plan-config";
import { getShareLinkLengths } from "./share-link-lengths";

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

export function parseShareLinkExpiryDays(
  value: unknown,
  lengths: ShareLinkLengths,
): number | null {
  if (value === undefined || value === null) {
    return defaultMonitorLinkExpiryDays(lengths.monitorLinkExpiryDays);
  }
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MONITOR_LINK_EXPIRY_DAYS_MAX
    ? value
    : null;
}

export function isLongShareLink(
  purpose: ShareLinkPurpose,
  allowsLongLinks: boolean,
): boolean {
  return purpose === "view" && allowsLongLinks;
}

export function shareLinkMaxMinutes(
  purpose: ShareLinkPurpose,
  allowsLongLinks: boolean,
  lengths: ShareLinkLengths,
): number {
  if (purpose === "trade") return lengths.tradeLinkHours * MINUTES_PER_HOUR;
  if (!allowsLongLinks) return lengths.restrictedShareLinkHours * MINUTES_PER_HOUR;
  return longestMonitorLinkExpiryDays(lengths.monitorLinkExpiryDays) * MINUTES_PER_DAY;
}

export function shareLinkExpiresInMinutes(
  purpose: ShareLinkPurpose,
  allowsLongLinks: boolean,
  requestedDays: number,
  lengths: ShareLinkLengths,
): number {
  const maxMinutes = shareLinkMaxMinutes(purpose, allowsLongLinks, lengths);
  return isLongShareLink(purpose, allowsLongLinks)
    ? Math.min(requestedDays * MINUTES_PER_DAY, maxMinutes)
    : maxMinutes;
}

export function cappedShareLinkLifetime(
  issuedAt: Date,
  expiresAt: Date,
  maxMinutes: number,
): ShareLinkLifetime | null {
  const cappedEnd = new Date(issuedAt.getTime() + maxMinutes * ONE_MINUTE_MS);
  const end = cappedEnd < expiresAt ? cappedEnd : expiresAt;
  if (end.getTime() <= Date.now()) return null;
  return { expiresAt: end };
}

export async function shareLinkLifetime(
  orgId: string,
  purpose: ShareLinkPurpose,
  issuedAt: Date,
  expiresAt: Date,
): Promise<ShareLinkLifetime | null> {
  const allowsLongLinks =
    purpose === "view" && (await allowsLongShareLinks(null, orgId));
  return cappedShareLinkLifetime(
    issuedAt,
    expiresAt,
    shareLinkMaxMinutes(purpose, allowsLongLinks, getShareLinkLengths()),
  );
}
