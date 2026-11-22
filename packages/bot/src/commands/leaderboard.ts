import {
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  escapeMarkdown,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getLeaderboard } from "../api";
import {
  DEFAULT_LEADERBOARD_PERIOD,
  DEFAULT_LEADERBOARD_RANKING,
  DISCORD_BLURPLE,
  LEADERBOARD_HIDE_SELF_HOSTED_OPTION,
  LEADERBOARD_PERIOD_CHOICES,
  LEADERBOARD_PERIOD_OPTION,
  LEADERBOARD_RANKING_CHOICES,
  LEADERBOARD_RANKING_OPTION,
} from "../lib/constants";
import type {
  LeaderboardPeriod,
  LeaderboardRanking,
  LeaderboardRow,
} from "../lib/interfaces";

function parseRanking(value: string | null): LeaderboardRanking {
  return (
    LEADERBOARD_RANKING_CHOICES.find((choice) => choice.value === value)
      ?.value ?? DEFAULT_LEADERBOARD_RANKING
  );
}

function parsePeriod(value: string | null): LeaderboardPeriod {
  return (
    LEADERBOARD_PERIOD_CHOICES.find((choice) => choice.value === value)
      ?.value ?? DEFAULT_LEADERBOARD_PERIOD
  );
}

function leaderboardTitle(
  ranking: LeaderboardRanking,
  period: LeaderboardPeriod,
): string {
  const parts = ["Leaderboard"];
  if (ranking === "cardsPerHour") parts.push("cards per hour");
  if (period !== DEFAULT_LEADERBOARD_PERIOD) {
    const periodName = LEADERBOARD_PERIOD_CHOICES.find(
      (choice) => choice.value === period,
    )?.name;
    if (periodName) parts.push(periodName.toLowerCase());
  }
  return parts.join(" · ");
}

function formatRow(row: LeaderboardRow, ranking: LeaderboardRanking): string {
  const name = row.name
    ? escapeMarkdown(row.name)
    : row.isAnonymous
      ? "*Anonymous organization*"
      : "Unknown organization";
  const count = row.scanCount.toLocaleString("en-US");
  const selfHosted = row.selfHostedScanCount ? " (self-hosted)" : "";
  const value =
    ranking === "cardsPerHour"
      ? `${count} cards/hr`
      : `${count} cards${selfHosted}`;
  return row.isOwnOrg
    ? `> **#${row.rank}  ${name}** (this server) · **${value}**`
    : `**#${row.rank}**  ${name} · ${value}`;
}

function formatRows(
  rows: LeaderboardRow[],
  size: number,
  ranking: LeaderboardRanking,
): string {
  const lines = rows.map((row) => formatRow(row, ranking));
  const ownRowIsBelowTop = rows.length > size && rows[rows.length - 1].isOwnOrg;
  if (ownRowIsBelowTop) lines.splice(lines.length - 1, 0, "⋯");
  return lines.join("\n");
}

function describeLeaderboard(
  ranking: LeaderboardRanking,
  size: number,
  includesSelfHosted: boolean,
): string {
  if (ranking === "cardsPerHour") {
    return `The ${size} organizations with the fastest machines on hosted Mault, from each machine's best 15 minutes of scanning, shown as cards per hour. Hand scans without a sorter and self-hosted instances aren't ranked here.`;
  }
  return includesSelfHosted
    ? `The ${size} organizations that have scanned the most cards with Mault, including scans synced from self-hosted instances (marked self-hosted).`
    : `The ${size} organizations that have scanned the most cards on hosted Mault.`;
}

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the organizations that have scanned the most cards with Mault")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
  .addStringOption((option) =>
    option
      .setName(LEADERBOARD_RANKING_OPTION)
      .setDescription("What to rank organizations by (default: most cards scanned)")
      .setRequired(false)
      .addChoices(...LEADERBOARD_RANKING_CHOICES),
  )
  .addStringOption((option) =>
    option
      .setName(LEADERBOARD_PERIOD_OPTION)
      .setDescription("Which scans to count (default: all time)")
      .setRequired(false)
      .addChoices(...LEADERBOARD_PERIOD_CHOICES),
  )
  .addBooleanOption((option) =>
    option
      .setName(LEADERBOARD_HIDE_SELF_HOSTED_OPTION)
      .setDescription("Leave out scans synced from self-hosted Mault instances")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const ranking = parseRanking(
    interaction.options.getString(LEADERBOARD_RANKING_OPTION),
  );
  const period = parsePeriod(
    interaction.options.getString(LEADERBOARD_PERIOD_OPTION),
  );
  const includeSelfHosted = !(
    interaction.options.getBoolean(LEADERBOARD_HIDE_SELF_HOSTED_OPTION) ?? false
  );
  const result = await getLeaderboard({
    guildId: interaction.guildId,
    ranking,
    period,
    includeSelfHosted,
  });
  if (!result.success || !result.data) {
    await interaction.editReply(
      "Couldn't load the leaderboard. Try again in a moment.",
    );
    return;
  }

  const { rows, size, linkedOrgOptedIn } = result.data;
  const includesSelfHosted =
    result.data.includesSelfHosted ??
    (ranking === "totalScans" && includeSelfHosted);
  const embed = new EmbedBuilder()
    .setTitle(leaderboardTitle(ranking, period))
    .setColor(DISCORD_BLURPLE)
    .setDescription(
      [
        describeLeaderboard(ranking, size, includesSelfHosted),
        "",
        rows.length
          ? formatRows(rows, size, ranking)
          : "No organizations have scanned any cards yet.",
      ].join("\n"),
    );

  embed.setFooter({
    text: [
      "Rankings update once a day.",
      linkedOrgOptedIn === false
        ? "This server's organization is shown anonymously. Show its name from Settings > General in Mault."
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  });

  await interaction.editReply({ embeds: [embed] });
}
