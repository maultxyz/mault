import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

const DISCORD_BLURPLE = 0x5865f2;

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List Magic Vault's commands");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("Magic Vault commands")
    .setColor(DISCORD_BLURPLE)
    .addFields(
      {
        name: "/link <code>",
        value:
          "Link this server to a Magic Vault organization (generate a code from Settings).",
      },
      {
        name: "/stats [collection]",
        value:
          "Show this organization's collection stats, optionally limited to one collection.",
      },
      {
        name: "/status [collection]",
        value:
          "Show which channels card-scan and error notifications currently go to, server-wide or for one collection.",
      },
      {
        name: "/scanning [channel] [collection]",
        value:
          "Set the channel for card-scan notifications (defaults to the current channel and every collection).",
      },
      {
        name: "/notification [channel] [collection]",
        value:
          "Set the channel for error/status notifications (defaults to the current channel and every collection).",
      },
      {
        name: "/clear scanning|notification [collection]",
        value:
          "Unlink a channel set by /scanning or /notification, optionally for just one collection.",
      },
      {
        name: "/help",
        value: "Show this message.",
      },
    );

  await interaction.reply({ embeds: [embed] });
}
