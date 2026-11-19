import {
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  escapeMarkdown,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getLeaderboard } from "../api";
import {
  DISCORD_BLURPLE,
  LEADERBOARD_HIDE_SELF_HOSTED_OPTION,
} from "../lib/constants";
import type { LeaderboardRow } from "../lib/interfaces";

function formatRow(row: LeaderboardRow): string {
  const name = row.name
    ? escapeMarkdown(row.name)
    : row.isAnonymous
      ? "*Anonymous organization*"
      : "Unknown organization";
  const selfHosted = row.selfHostedScanCount ? " (self-hosted)" : "";
  const cards = `${row.scanCount.toLocaleString("en-US")} cards${selfHosted}`;
  return row.isOwnOrg
    ? `**#${row.rank}  ${name}** (this server) · ${cards}`
    : `**#${row.rank}**  ${name} · ${cards}`;
}

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the organizations that have scanned the most cards with Mault")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
  .addBooleanOption((option) =>
    option
      .setName(LEADERBOARD_HIDE_SELF_HOSTED_OPTION)
      .setDescription("Leave out scans synced from self-hosted Mault instances")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const includeSelfHosted = !(
    interaction.options.getBoolean(LEADERBOARD_HIDE_SELF_HOSTED_OPTION) ?? false
  );
  const result = await getLeaderboard(interaction.guildId, includeSelfHosted);
  if (!result.success || !result.data) {
    await interaction.editReply(
      "Couldn't load the leaderboard. Try again in a moment.",
    );
    return;
  }

  const { rows, size, linkedOrgOptedIn } = result.data;
  const embed = new EmbedBuilder()
    .setTitle("Leaderboard")
    .setColor(DISCORD_BLURPLE)
    .setDescription(
      [
        includeSelfHosted
          ? `The ${size} organizations that have scanned the most cards with Mault, including scans synced from self-hosted instances (marked self-hosted).`
          : `The ${size} organizations that have scanned the most cards on hosted Mault.`,
        "",
        rows.length
          ? rows.map(formatRow).join("\n")
          : "No organizations have scanned any cards yet.",
      ].join("\n"),
    );

  if (linkedOrgOptedIn === false) {
    embed.setFooter({
      text: "This server's organization is shown anonymously. Show its name from Settings > General in Mault.",
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
