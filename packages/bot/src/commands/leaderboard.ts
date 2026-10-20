import {
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  escapeMarkdown,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getLeaderboard } from "../api";
import { DISCORD_BLURPLE } from "../lib/constants";
import type { LeaderboardRow } from "../lib/interfaces";

function formatRow(row: LeaderboardRow): string {
  const name = escapeMarkdown(row.name ?? "Unknown organization");
  const cards = `${row.scanCount.toLocaleString("en-US")} cards`;
  return row.isOwnOrg
    ? `**#${row.rank}  ${name}** (this server) · ${cards}`
    : `**#${row.rank}**  ${name} · ${cards}`;
}

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the organizations that have scanned the most cards with Mault")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const result = await getLeaderboard(interaction.guildId);
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
        `The ${size} organizations that have scanned the most cards with Mault.`,
        "",
        rows.length
          ? rows.map(formatRow).join("\n")
          : "No organizations have joined the leaderboard yet.",
      ].join("\n"),
    );

  if (linkedOrgOptedIn === false) {
    embed.setFooter({
      text: "This server's organization isn't on the leaderboard. Join from Settings > General in Mault.",
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
