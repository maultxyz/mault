import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getCollections, getStatus, type StatusOverride } from "../api";

const DISCORD_BLURPLE = 0x5865f2;
const NOT_LINKED_MESSAGE =
  "This server isn't linked yet - run `/link <code>` first (generate a code from Magic Vault's Settings page).";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show which channels card-scan and error notifications go to")
  .addStringOption((opt) =>
    opt
      .setName("collection")
      .setDescription("Check one collection's notification channels")
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

function channelOrNotSet(channelId: string | null): string {
  return channelId ? `<#${channelId}>` : "*Not set*";
}

function formatOverride(o: StatusOverride): string {
  const parts: string[] = [];
  if (o.scanChannelId) parts.push(`scans → <#${o.scanChannelId}>`);
  if (o.errorChannelId) parts.push(`errors → <#${o.errorChannelId}>`);
  return `**${o.name}**: ${parts.join(", ")}`;
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
  const result = await getStatus(interaction.guildId, collectionGuid);
  if (!result.success || !result.data) {
    await interaction.editReply(
      result.message === "not_linked"
        ? NOT_LINKED_MESSAGE
        : result.message === "collection_not_found"
          ? "That collection couldn't be found."
          : "Couldn't load notification status.",
    );
    return;
  }

  const { orgScanChannelId, orgErrorChannelId, collection, overrides } =
    result.data;

  if (collection) {
    const embed = new EmbedBuilder()
      .setTitle(`Notification status — ${collection.name}`)
      .setColor(DISCORD_BLURPLE)
      .addFields(
        {
          name: "Card scans",
          value: collection.scanChannelId
            ? `${channelOrNotSet(collection.scanChannelId)} (collection override)`
            : orgScanChannelId
              ? `${channelOrNotSet(orgScanChannelId)} (server default)`
              : "*Not set*",
        },
        {
          name: "Errors/status",
          value: collection.errorChannelId
            ? `${channelOrNotSet(collection.errorChannelId)} (collection override)`
            : orgErrorChannelId
              ? `${channelOrNotSet(orgErrorChannelId)} (server default)`
              : "*Not set*",
        },
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Notification status")
    .setColor(DISCORD_BLURPLE)
    .addFields(
      { name: "Card scans (server default)", value: channelOrNotSet(orgScanChannelId) },
      { name: "Errors/status (server default)", value: channelOrNotSet(orgErrorChannelId) },
    );

  if (overrides.length > 0) {
    embed.addFields({
      name: "Per-collection overrides",
      value: overrides.map(formatOverride).join("\n"),
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
