import { eq } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collections, orgSettings } from "../../db/schema";

export async function clearOrgDiscordReferences(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  const now = new Date();
  await tx
    .update(orgSettings)
    .set({
      discordGuildId: null,
      discordLinkCode: null,
      discordLinkCodeExpiresAt: null,
      discordScanChannelId: null,
      discordScanThreadId: null,
      discordErrorChannelId: null,
      discordErrorThreadId: null,
      discordNotifyOnScan: false,
      updatedAt: now,
    })
    .where(eq(orgSettings.orgId, orgId));
  await tx
    .update(collections)
    .set({
      discordScanChannelId: null,
      discordScanThreadId: null,
      discordErrorChannelId: null,
      discordErrorThreadId: null,
      updatedAt: now,
    })
    .where(eq(collections.orgId, orgId));
}
