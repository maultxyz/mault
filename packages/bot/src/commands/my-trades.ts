import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getMyTradeOffers } from "../api";
import { ACCOUNT_NOT_LINKED_MESSAGE } from "../lib/constants";

export const data = new SlashCommandBuilder()
  .setName("my-trades")
  .setDescription("See the trade offers you've sent (only you can see the reply)")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await getMyTradeOffers(interaction.user.id).catch(() => null);
  if (!result?.success || !result.data) {
    await interaction.editReply(
      result?.message === "account_not_linked"
        ? ACCOUNT_NOT_LINKED_MESSAGE
        : "Couldn't load your trade offers. Try again in a moment.",
    );
    return;
  }
  await interaction.editReply({ embeds: [result.data.embed] });
}
