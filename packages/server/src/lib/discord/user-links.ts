import type {
  DiscordAccountLink,
  DiscordAccountLinkCode,
} from "@magic-vault/shared";
import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "../../db";
import { discordUserLinks } from "../../db/schema";
import { DISCORD_LINK_CODE_LENGTH } from "../constants/discord";
import { DISCORD_LINK_CODE_TTL_MS } from "../constants/timing";

export async function loadDiscordUserLink(
  userId: string,
): Promise<DiscordAccountLink | null> {
  const [row] = await db
    .select({
      discordUserId: discordUserLinks.discordUserId,
      discordUsername: discordUserLinks.discordUsername,
      linkedAt: discordUserLinks.linkedAt,
    })
    .from(discordUserLinks)
    .where(eq(discordUserLinks.userId, userId))
    .limit(1);
  if (!row?.discordUserId || !row.linkedAt) return null;
  return {
    discordUsername: row.discordUsername,
    linkedAt: row.linkedAt.toISOString(),
  };
}

export async function createDiscordUserLinkCode(
  userId: string,
): Promise<DiscordAccountLinkCode> {
  const code = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, DISCORD_LINK_CODE_LENGTH)
    .toUpperCase();
  const expiresAt = new Date(Date.now() + DISCORD_LINK_CODE_TTL_MS);
  await db
    .insert(discordUserLinks)
    .values({ userId, linkCode: code, linkCodeExpiresAt: expiresAt })
    .onConflictDoUpdate({
      target: [discordUserLinks.userId],
      set: { linkCode: code, linkCodeExpiresAt: expiresAt, updatedAt: new Date() },
    });
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function unlinkDiscordUser(userId: string): Promise<void> {
  await db
    .update(discordUserLinks)
    .set({
      discordUserId: null,
      discordUsername: null,
      linkedAt: null,
      linkCode: null,
      linkCodeExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(discordUserLinks.userId, userId));
}

export async function redeemDiscordUserLinkCode(
  code: string,
  discordUserId: string,
  discordUsername: string,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ userId: discordUserLinks.userId })
      .from(discordUserLinks)
      .where(
        and(
          eq(discordUserLinks.linkCode, code),
          gt(discordUserLinks.linkCodeExpiresAt, new Date()),
        ),
      )
      .limit(1)
      .for("update");
    if (!row) return null;

    const now = new Date();
    await tx
      .update(discordUserLinks)
      .set({
        discordUserId: null,
        discordUsername: null,
        linkedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(discordUserLinks.discordUserId, discordUserId),
          ne(discordUserLinks.userId, row.userId),
        ),
      );
    await tx
      .update(discordUserLinks)
      .set({
        discordUserId,
        discordUsername,
        linkedAt: now,
        linkCode: null,
        linkCodeExpiresAt: null,
        updatedAt: now,
      })
      .where(eq(discordUserLinks.userId, row.userId));
    return row.userId;
  });
}
