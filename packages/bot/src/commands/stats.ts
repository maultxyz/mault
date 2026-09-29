import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getCollections, getStats } from "../api";

const DISCORD_BLURPLE = 0x5865f2;
const NOT_LINKED_MESSAGE =
  "This server isn't linked yet - run `/link <code>` first (generate a code from Magic Vault's Settings page).";

export const data = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Show this organization's collection stats")
  .addStringOption((opt) =>
    opt
      .setName("collection")
      .setDescription("Limit stats to one collection")
      .setAutocomplete(true)
      .setRequired(false),
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused().toLowerCase();
  const result = await getCollections(interaction.guildId);
  if (!result.success || !result.data) {
    await interaction.respond([]);
    return;
  }

  const choices = result.data
    .filter(
      (c): c is typeof c & { guid: string } =>
        !!c.guid && c.name.toLowerCase().includes(focused),
    )
    .slice(0, 25)
    .map((c) => ({ name: c.name, value: c.guid }));

  await interaction.respond(choices);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command only works in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const collectionGuid =
    interaction.options.getString("collection") ?? undefined;
  await interaction.deferReply();
  const result = await getStats(interaction.guildId, collectionGuid);
  if (!result.success || !result.data) {
    await interaction.editReply(
      result.message === "not_linked"
        ? NOT_LINKED_MESSAGE
        : result.message === "collection_not_found"
          ? "That collection couldn't be found."
          : "Couldn't load stats.",
    );
    return;
  }

  const {
    collectionCount,
    cardCount,
    totalValue,
    totalValueDisplay,
    collectionName,
  } = result.data;
  const embed = new EmbedBuilder()
    .setTitle(
      collectionName
        ? `Collection stats — ${collectionName}`
        : "Collection stats",
    )
    .setColor(DISCORD_BLURPLE)
    .addFields(
      ...(collectionName
        ? []
        : [
            {
              name: "Collections",
              value: String(collectionCount),
              inline: true,
            },
          ]),
      { name: "Cards", value: String(cardCount), inline: true },
      {
        name: "Estimated value",
        value: totalValueDisplay ?? `$${totalValue.toFixed(2)} USD`,
        inline: true,
      },
    );

  await interaction.editReply({ embeds: [embed] });
}
