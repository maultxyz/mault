import {
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getShowoff } from "../api";
import { ACCOUNT_NOT_LINKED_MESSAGE, DISCORD_BLURPLE } from "../lib/constants";

export const data = new SlashCommandBuilder()
  .setName("showoff")
  .setDescription("Show off your collection's total value and your most valuable card")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const result = await getShowoff(interaction.user.id, interaction.guildId);
  if (!result.success || !result.data) {
    await interaction.editReply(
      result.message === "account_not_linked"
        ? ACCOUNT_NOT_LINKED_MESSAGE
        : result.message === "no_organizations"
          ? "Your Mault account isn't in any organization yet."
          : "Couldn't load your collection.",
    );
    return;
  }

  const { cardCount, collectionCount, totalValueDisplay, orgName, topCard } =
    result.data;
  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.displayName}'s collection`)
    .setColor(DISCORD_BLURPLE)
    .setDescription(
      `**${cardCount}** cards across **${collectionCount}** ${
        collectionCount === 1 ? "collection" : "collections"
      } in **${orgName}**`,
    )
    .addFields({
      name: "Total value",
      value: totalValueDisplay ?? "Unknown",
      inline: true,
    });

  if (topCard) {
    const details = [topCard.setName, topCard.foil].filter(Boolean);
    embed.addFields({
      name: "Most valuable card",
      value: `**${topCard.name}** · ${topCard.priceDisplay}${
        details.length ? `\n${details.join(" · ")}` : ""
      }`,
      inline: true,
    });
    if (topCard.imageUrl) embed.setImage(topCard.imageUrl);
  }

  await interaction.editReply({ embeds: [embed] });
}
