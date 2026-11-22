import {
  DEFAULT_SHARE_LINK_LENGTHS,
  shareLinkLengthsSchema,
  type ShareLinkLengths,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { platformShareLinkSettings } from "../db/schema";
import { PLATFORM_SHARE_LINK_SETTINGS_ID } from "./constants/share-link-lengths";

let cachedLengths: ShareLinkLengths = DEFAULT_SHARE_LINK_LENGTHS;

export function getShareLinkLengths(): ShareLinkLengths {
  return cachedLengths;
}

export function parseShareLinkLengths(input: unknown): ShareLinkLengths | null {
  const parsed = shareLinkLengthsSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    monitorLinkExpiryDays: [...parsed.data.monitorLinkExpiryDays].sort((a, b) => a - b),
  };
}

export async function refreshShareLinkLengths(): Promise<ShareLinkLengths> {
  const row = await db.query.platformShareLinkSettings.findFirst({
    where: eq(platformShareLinkSettings.id, PLATFORM_SHARE_LINK_SETTINGS_ID),
  });
  cachedLengths =
    (row &&
      parseShareLinkLengths({
        tradeLinkHours: row.tradeLinkHours,
        restrictedShareLinkHours: row.restrictedShareLinkHours,
        monitorLinkExpiryDays: row.monitorLinkExpiryDays,
      })) ||
    DEFAULT_SHARE_LINK_LENGTHS;
  return cachedLengths;
}

export async function saveShareLinkLengths(
  lengths: ShareLinkLengths,
): Promise<ShareLinkLengths> {
  const values = {
    id: PLATFORM_SHARE_LINK_SETTINGS_ID,
    ...lengths,
    updatedAt: new Date(),
  };
  await db
    .insert(platformShareLinkSettings)
    .values(values)
    .onConflictDoUpdate({ target: platformShareLinkSettings.id, set: values });
  return refreshShareLinkLengths();
}
