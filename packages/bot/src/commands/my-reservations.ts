import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getMyReservations } from "../api";
import { ACCOUNT_NOT_LINKED_MESSAGE } from "../lib/constants";

export const data = new SlashCommandBuilder()
  .setName("my-reservations")
  .setDescription("See your card reservations (only you can see the reply)")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await getMyReservations(interaction.user.id).catch(() => null);
  if (!result?.success || !result.data) {
    await interaction.editReply(
      result?.message === "account_not_linked"
        ? ACCOUNT_NOT_LINKED_MESSAGE
        : "Couldn't load your reservations. Try again in a moment.",
    );
    return;
  }
  await interaction.editReply({ embeds: [result.data.embed] });
}
