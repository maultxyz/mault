import {
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getShowcase, getShowcaseTargets } from "../api";
import {
  ACCOUNT_NOT_LINKED_MESSAGE,
  DISCORD_AUTOCOMPLETE_MAX_CHOICES,
  DISCORD_AUTOCOMPLETE_VALUE_MAX_LENGTH,
  DISCORD_BLURPLE,
  SHOWCASE_KIND_LABELS,
  UUID_PATTERN,
} from "../lib/constants";
import type {
  ShowcaseKind,
  ShowcaseResult,
  TopCardSummary,
} from "../lib/interfaces";
import { truncateSelectText } from "../lib/select-prompt";

export const data = new SlashCommandBuilder()
  .setName("showcase")
  .setDescription("Show off one of your collections or storage locations")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("collection")
      .setDescription("Show off one of your collections")
      .addStringOption((option) =>
        option
          .setName("name")
          .setDescription("The collection to show off")
          .setAutocomplete(true)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("storage")
      .setDescription("Show off one of your storage locations")
      .addStringOption((option) =>
        option
          .setName("name")
          .setDescription("The storage location to show off")
          .setAutocomplete(true)
          .setRequired(true),
      ),
  );

function showcaseKindOf(
  interaction: ChatInputCommandInteraction | AutocompleteInteraction,
): ShowcaseKind {
  return interaction.options.getSubcommand() === "storage" ? "storage" : "collection";
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const result = await getShowcaseTargets(
    interaction.user.id,
    interaction.guildId,
    showcaseKindOf(interaction),
    interaction.options.getFocused().slice(0, DISCORD_AUTOCOMPLETE_VALUE_MAX_LENGTH),
  );
  if (!result.success || !result.data) {
    await interaction.respond([]);
    return;
  }
  const showsOrgNames = new Set(result.data.map((target) => target.orgName)).size > 1;
  await interaction.respond(
    result.data.slice(0, DISCORD_AUTOCOMPLETE_MAX_CHOICES).map((target) => ({
      name: truncateSelectText(
        showsOrgNames ? `${target.name} (${target.orgName})` : target.name,
      ),
      value: target.guid,
    })),
  );
}

async function resolveTargetGuid(
  interaction: ChatInputCommandInteraction,
  kind: ShowcaseKind,
  typedValue: string,
): Promise<{ guid: string } | { failureMessage: string | undefined }> {
  if (UUID_PATTERN.test(typedValue)) return { guid: typedValue };
  const result = await getShowcaseTargets(
    interaction.user.id,
    interaction.guildId,
    kind,
    typedValue,
  );
  if (!result.success) return { failureMessage: result.message };
  const targets = result.data ?? [];
  const exactMatch = targets.find(
    (target) => target.name.toLowerCase() === typedValue.trim().toLowerCase(),
  );
  if (exactMatch) return { guid: exactMatch.guid };
  if (targets.length === 1) return { guid: targets[0].guid };
  return { failureMessage: "showcase_not_found" };
}

function failureReply(failureMessage: string | undefined, kindLabel: string) {
  if (failureMessage === "account_not_linked") return ACCOUNT_NOT_LINKED_MESSAGE;
  if (failureMessage === "showcase_not_found") {
    return `Couldn't find that ${kindLabel}. Pick one from the list as you type.`;
  }
  return `Couldn't load that ${kindLabel}.`;
}

function describeTopCard(card: TopCardSummary, rank: number, kind: ShowcaseKind) {
  const details = [
    card.setName,
    card.foil,
    kind === "storage" ? card.collectionName : null,
  ].filter(Boolean);
  return `${rank}. **${card.name}** · ${card.priceDisplay}${
    details.length ? `\n${details.join(" · ")}` : ""
  }`;
}

function buildShowcaseEmbed(sharedBy: string, showcase: ShowcaseResult) {
  const summary = [
    `**${showcase.cardCount}** ${showcase.cardCount === 1 ? "card" : "cards"}`,
    showcase.gameNames.join(", ") || null,
    `in **${showcase.orgName}**`,
  ]
    .filter(Boolean)
    .join(" · ");
  const embed = new EmbedBuilder()
    .setTitle(showcase.name)
    .setAuthor({ name: `${sharedBy}'s ${SHOWCASE_KIND_LABELS[showcase.kind]}` })
    .setColor(DISCORD_BLURPLE)
    .setDescription(summary)
    .addFields({ name: "Total value", value: showcase.totalValueDisplay });

  if (showcase.topCards.length > 0) {
    embed.addFields({
      name: "Most valuable cards",
      value: showcase.topCards
        .map((card, index) => describeTopCard(card, index + 1, showcase.kind))
        .join("\n"),
    });
    const imageUrl = showcase.topCards[0].imageUrl;
    if (imageUrl) embed.setImage(imageUrl);
  }
  return embed;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const kind = showcaseKindOf(interaction);
  const kindLabel = SHOWCASE_KIND_LABELS[kind];
  await interaction.deferReply();

  const target = await resolveTargetGuid(
    interaction,
    kind,
    interaction.options.getString("name", true),
  );
  if ("failureMessage" in target) {
    await interaction.editReply(failureReply(target.failureMessage, kindLabel));
    return;
  }

  const result = await getShowcase(interaction.user.id, kind, target.guid);
  if (!result.success || !result.data) {
    await interaction.editReply(failureReply(result.message, kindLabel));
    return;
  }

  await interaction.editReply({
    embeds: [buildShowcaseEmbed(interaction.user.displayName, result.data)],
  });
}
