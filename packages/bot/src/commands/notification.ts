import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getCollections, setChannel } from "../api";

const NOT_LINKED_MESSAGE =
  "This server isn't linked yet - run `/link <code>` first (generate a code from Magic Vault's Settings page).";

export const data = new SlashCommandBuilder()
  .setName("notification")
  .setDescription("Set the channel for Magic Vault error/status notifications")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to post notifications in (defaults to this channel)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("collection")
      .setDescription(
        "Only route this collection's notifications here (defaults to every collection)",
      )
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

  const channel = interaction.options.getChannel("channel") ?? interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Pick a text channel for this.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const collectionGuid =
    interaction.options.getString("collection") ?? undefined;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await setChannel(
    interaction.guildId,
    channel.id,
    "error",
    collectionGuid,
  );
  if (!result.success) {
    await interaction.editReply(
      result.message === "not_linked"
        ? NOT_LINKED_MESSAGE
        : result.message === "collection_not_found"
          ? "That collection couldn't be found."
          : "Couldn't save that.",
    );
    return;
  }

  await interaction.editReply(
    collectionGuid
      ? `Error notifications for that collection will now be posted in <#${channel.id}>.`
      : `Error notifications will now be posted in <#${channel.id}>.`,
  );
}
