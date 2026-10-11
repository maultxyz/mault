import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { linkGuild } from "../api";
import { LINK_CONFIRM_TIMEOUT_MS } from "../lib/constants";

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link this Discord server to a Magic Vault organization")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((opt) =>
    opt
      .setName("code")
      .setDescription("The code shown in Magic Vault's Settings > Notifications")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command only works in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId;
  const code = interaction.options.getString("code", true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await linkGuild(guildId, code);

  if (result.message === "already_linked") {
    const currentOrgName =
      result.data?.currentOrgName ?? "another organization";
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("link-confirm")
        .setLabel("Relink")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("link-cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary),
    );
    const message = await interaction.editReply({
      content: `This server is already linked to **${currentOrgName}**. Relinking will disconnect it from that organization. Continue?`,
      components: [row],
    });

    try {
      const button = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: LINK_CONFIRM_TIMEOUT_MS,
        filter: (i) => i.user.id === interaction.user.id,
      });

      if (button.customId === "link-cancel") {
        await button.update({ content: "Cancelled.", components: [] });
        return;
      }

      await button.deferUpdate();
      const confirmed = await linkGuild(guildId, code, true);
      if (!confirmed.success || !confirmed.data?.orgName) {
        await interaction.editReply({
          content: confirmed.message ?? "Invalid or expired code.",
          components: [],
        });
        return;
      }
      await interaction.editReply({
        content: `Linked this server to **${confirmed.data.orgName}**. Run \`/stats\` to check collection stats, or \`/scanning\` and \`/notification\` to get card-scan and error notifications here.`,
        components: [],
      });
    } catch {
      await interaction.editReply({
        content: "Timed out - run `/link` again if you still want to relink.",
        components: [],
      });
    }
    return;
  }

  if (!result.success || !result.data?.orgName) {
    await interaction.editReply(result.message ?? "Invalid or expired code.");
    return;
  }

  await interaction.editReply(
    `Linked this server to **${result.data.orgName}**. Run \`/stats\` to check collection stats, or \`/scanning\` and \`/notification\` to get card-scan and error notifications here.`,
  );
}
