import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type SlashCommandSubcommandBuilder,
} from "discord.js";
import { clearChannel, getCollections, type NotificationKind } from "../api";

const NOT_LINKED_MESSAGE =
  "This server isn't linked yet - run `/link <code>` first (generate a code from Magic Vault's Settings page).";

const KIND_BY_SUBCOMMAND: Record<string, NotificationKind> = {
  scanning: "scan",
  notification: "error",
};

function addCollectionOption(sub: SlashCommandSubcommandBuilder) {
  return sub.addStringOption((opt) =>
    opt
      .setName("collection")
      .setDescription(
        "Only unlink this collection (defaults to the whole server)",
      )
      .setAutocomplete(true)
      .setRequired(false),
  );
}

export const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Unlink a Magic Vault Discord notification channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    addCollectionOption(
      sub
        .setName("scanning")
        .setDescription("Unlink the card-scan notification channel"),
    ),
  )
  .addSubcommand((sub) =>
    addCollectionOption(
      sub
        .setName("notification")
        .setDescription("Unlink the error/status notification channel"),
    ),
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

  const kind = KIND_BY_SUBCOMMAND[interaction.options.getSubcommand()];
  const collectionGuid =
    interaction.options.getString("collection") ?? undefined;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await clearChannel(interaction.guildId, kind, collectionGuid);
  if (!result.success) {
    await interaction.editReply(
      result.message === "not_linked"
        ? NOT_LINKED_MESSAGE
        : result.message === "collection_not_found"
          ? "That collection couldn't be found."
          : "Couldn't clear that.",
    );
    return;
  }

  const label = kind === "scan" ? "scan" : "notification";
  await interaction.editReply(
    collectionGuid
      ? `That collection's ${label} channel override was removed - it'll use the server-wide channel again.`
      : `The server-wide ${label} channel was cleared - it won't post here until you set one again.`,
  );
}
