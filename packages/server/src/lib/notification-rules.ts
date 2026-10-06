import {
  evaluateRuleGroup,
  type BinRuleGroup,
  type FieldMeta,
  type NotificationRule,
  type PlayingCard,
  type ScanRuleState,
  toRuleCard,
  withScanRuleFields,
} from "@magic-vault/shared";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { games, notificationRules, orgSettings } from "../db/schema";
import { NOTIFICATION_RULE_FOOTER_PREFIX } from "./constants/discord";
import { sendDiscordChannelMessage } from "./discord";
import type { DiscordEmbed } from "./interfaces/discord";

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
      roleId: notificationRules.roleId,
    })
    .from(notificationRules)
    .innerJoin(games, eq(games.id, notificationRules.gameId))
    .where(
      and(
        eq(notificationRules.orgId, orgId),
        eq(notificationRules.gameId, gameId),
        eq(notificationRules.isDeleted, false),
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
    roleId: row.roleId,
  }));
}

export async function postMatchingNotificationRules(params: {
  orgId: string;
  gameId: number | null;
  card: PlayingCard;
  scan: ScanRuleState;
  embed: DiscordEmbed;
  attachmentDataUrl?: string;
  secondaryImageUrl?: string;
}): Promise<void> {
  const {
    orgId,
    gameId,
    card,
    scan,
    embed,
    attachmentDataUrl,
    secondaryImageUrl,
  } = params;
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
      roleId: notificationRules.roleId,
    })
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.orgId, orgId),
        eq(notificationRules.gameId, gameId),
        eq(notificationRules.isEnabled, true),
        eq(notificationRules.isDeleted, false),
        isNotNull(notificationRules.channelId),
      ),
    )
    .orderBy(asc(notificationRules.id));
  if (!rules.length) return;

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { fieldDefinitions: true, foilTypes: true },
  });
  const fields = withScanRuleFields(
    (game?.fieldDefinitions as FieldMeta[] | undefined) ?? [],
    (game?.foilTypes as string[] | undefined) ?? [],
  );
  const ruleCard = toRuleCard(card, scan);

  const matchesByChannel = new Map<
    string,
    { names: string[]; roleIds: Set<string> }
  >();
  for (const rule of rules) {
    if (!evaluateRuleGroup(ruleCard, rule.rules as BinRuleGroup, fields)) {
      continue;
    }
    const match = matchesByChannel.get(rule.channelId!) ?? {
      names: [],
      roleIds: new Set<string>(),
    };
    match.names.push(rule.name);
    if (rule.roleId) match.roleIds.add(rule.roleId);
    matchesByChannel.set(rule.channelId!, match);
  }

  await Promise.all(
    [...matchesByChannel].map(([channelId, { names, roleIds }]) =>
      sendDiscordChannelMessage({
        guildId: settings.guildId!,
        channelId,
        embed: {
          ...embed,
          footer: {
            text: `${NOTIFICATION_RULE_FOOTER_PREFIX}${names.join(", ")}`,
          },
        },
        attachmentDataUrl,
        secondaryImageUrl,
        pingRoleIds: [...roleIds],
      }),
    ),
  );
}
