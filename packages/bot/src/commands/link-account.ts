import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { linkAccount } from "../api";

export const data = new SlashCommandBuilder()
  .setName("link-account")
  .setDescription("Link your Discord account to your Mault account")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
  .addStringOption((opt) =>
    opt
      .setName("code")
      .setDescription("The code shown in Mault's Account > Discord account")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const code = interaction.options.getString("code", true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await linkAccount(
    interaction.user.id,
    interaction.user.username,
    code,
  );

  if (!result.success) {
    await interaction.editReply(result.message ?? "Invalid or expired code.");
    return;
  }

  const userName = result.data?.userName;
  await interaction.editReply(
    userName
      ? `Linked your Discord account to **${userName}** on Mault.`
      : "Linked your Discord account to Mault.",
  );
}
