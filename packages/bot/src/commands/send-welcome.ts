import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { deliverWelcomeDm, isWelcomeGuild } from "../welcome-dm";

export const data = new SlashCommandBuilder()
  .setName("send-welcome")
  .setDescription("Send the Mault welcome DM to a member of this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild)
  .addUserOption((opt) =>
    opt
      .setName("member")
      .setDescription("The member to send the welcome DM to")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "This command only works in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isWelcomeGuild(guild.id)) {
    await interaction.reply({
      content: "Welcome DMs aren't turned on for this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser("member", true);
  if (user.bot) {
    await interaction.reply({
      content: "Bots don't get welcome DMs.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.editReply(`<@${user.id}> isn't a member of this server.`);
    return;
  }

  const sent = await deliverWelcomeDm(member);
  await interaction.editReply(
    sent
      ? `Sent the welcome DM to <@${user.id}>.`
      : `Couldn't DM <@${user.id}>. They may have DMs from server members turned off.`,
  );
}
