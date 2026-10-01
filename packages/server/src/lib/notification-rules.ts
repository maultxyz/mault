import {
  evaluateRuleGroup,
  type BinRuleGroup,
  type FieldMeta,
  type NotificationRule,
  type PlayingCard,
} from "@magic-vault/shared";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { games, notificationRules, orgSettings } from "../db/schema";
import { NOTIFICATION_RULE_FOOTER_PREFIX } from "./constants/discord";
import { sendDiscordChannelMessage, type DiscordEmbed } from "./discord";

export async function loadNotificationRules(
  tx: Transaction,
  orgId: string,
  gameId: number,
): Promise<NotificationRule[]> {
  const rows = await tx
    .select({
      guid: notificationRules.guid,
      gameGuid: games.guid,
      name: notificationRules.name,
      isEnabled: notificationRules.isEnabled,
      rules: notificationRules.rules,
      channelId: notificationRules.channelId,
    })
    .from(notificationRules)
    .innerJoin(games, eq(games.id, notificationRules.gameId))
    .where(
      and(
        eq(notificationRules.orgId, orgId),
        eq(notificationRules.gameId, gameId),
      ),
    )
    .orderBy(asc(notificationRules.id));
  return rows.map((row) => ({
    guid: row.guid!,
    gameGuid: row.gameGuid!,
    name: row.name,
    isEnabled: row.isEnabled,
    rules: row.rules as BinRuleGroup,
    channelId: row.channelId,
  }));
}

export async function postMatchingNotificationRules(params: {
  orgId: string;
  gameId: number | null;
  card: PlayingCard;
  embed: DiscordEmbed;
  attachmentDataUrl?: string;
  secondaryImageUrl?: string;
}): Promise<void> {
  const { orgId, gameId, card, embed, attachmentDataUrl, secondaryImageUrl } =
    params;
  if (gameId === null) return;

  const [settings] = await db
    .select({ guildId: orgSettings.discordGuildId })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  if (!settings?.guildId) return;

  const rules = await db
    .select({
      name: notificationRules.name,
      rules: notificationRules.rules,
      channelId: notificationRules.channelId,
    })
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.orgId, orgId),
        eq(notificationRules.gameId, gameId),
        eq(notificationRules.isEnabled, true),
        isNotNull(notificationRules.channelId),
      ),
    )
    .orderBy(asc(notificationRules.id));
  if (!rules.length) return;

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { fieldDefinitions: true },
  });
  const fields = (game?.fieldDefinitions as FieldMeta[] | undefined) ?? [];

  const ruleNamesByChannel = new Map<string, string[]>();
  for (const rule of rules) {
    if (!evaluateRuleGroup(card, rule.rules as BinRuleGroup, fields)) continue;
    const names = ruleNamesByChannel.get(rule.channelId!) ?? [];
    names.push(rule.name);
    ruleNamesByChannel.set(rule.channelId!, names);
  }

  await Promise.all(
    [...ruleNamesByChannel].map(([channelId, names]) =>
      sendDiscordChannelMessage(
        settings.guildId!,
        channelId,
        {
          ...embed,
          footer: { text: `${NOTIFICATION_RULE_FOOTER_PREFIX}${names.join(", ")}` },
        },
        attachmentDataUrl,
        secondaryImageUrl,
      ),
    ),
  );
}
