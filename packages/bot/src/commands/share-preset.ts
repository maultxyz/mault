import {
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getRulePreset, getRulePresets } from "../api";
import {
  ACCOUNT_NOT_LINKED_MESSAGE,
  DISCORD_BLURPLE,
  DISCORD_EMBED_DESCRIPTION_MAX_LENGTH,
} from "../lib/constants";
import type { RulePresetResult, RulePresetSummary } from "../lib/interfaces";
import { promptForSelection } from "../lib/select-prompt";

export const data = new SlashCommandBuilder()
  .setName("share-preset")
  .setDescription("Share one of your rule presets")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

function describePreset(preset: RulePresetSummary) {
  return [preset.orgName, preset.gameName, preset.isActive ? "Active" : null]
    .filter(Boolean)
    .join(" · ");
}

function fitBinLines(header: string, binLines: string[]) {
  if (binLines.length === 0) return `${header}\nNo bins configured.`;
  let shownLines = binLines;
  let text = [header, ...shownLines].join("\n");
  while (text.length > DISCORD_EMBED_DESCRIPTION_MAX_LENGTH && shownLines.length > 1) {
    shownLines = shownLines.slice(0, -1);
    const hiddenCount = binLines.length - shownLines.length;
    text = [
      header,
      ...shownLines,
      `...and ${hiddenCount} more ${hiddenCount === 1 ? "bin" : "bins"}`,
    ].join("\n");
  }
  return text.slice(0, DISCORD_EMBED_DESCRIPTION_MAX_LENGTH);
}

function buildPresetEmbed(sharedBy: string, preset: RulePresetResult) {
  const header = [
    `Shared by **${sharedBy}**`,
    preset.gameName,
    preset.modeLabel ? `${preset.modeLabel} mode` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return new EmbedBuilder()
    .setTitle(`${preset.presetName} rules`)
    .setColor(DISCORD_BLURPLE)
    .setDescription(fitBinLines(`${header}\n`, preset.binLines));
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const presetsResult = await getRulePresets(
    interaction.user.id,
    interaction.guildId,
  );
  if (!presetsResult.success || !presetsResult.data) {
    await interaction.editReply(
      presetsResult.message === "account_not_linked"
        ? ACCOUNT_NOT_LINKED_MESSAGE
        : "Couldn't load your rule presets.",
    );
    return;
  }
  if (presetsResult.data.length === 0) {
    await interaction.editReply(
      "You don't have any rule presets in your Mault organizations yet.",
    );
    return;
  }

  const pickedGuid = await promptForSelection(interaction, {
    customId: "share-preset",
    prompt: "Which rule preset do you want to share?",
    placeholder: "Pick a preset to share",
    options: presetsResult.data.map((preset) => ({
      label: preset.name,
      description: describePreset(preset),
      value: preset.guid,
    })),
    timeoutMessage: "Timed out. Run `/share-preset` again to share a preset.",
  });
  if (!pickedGuid) return;

  const presetResult = await getRulePreset(interaction.user.id, pickedGuid);
  if (!presetResult.success || !presetResult.data) {
    await interaction.editReply({
      content:
        presetResult.message === "preset_not_found"
          ? "That preset is no longer available."
          : "Couldn't load that preset.",
      components: [],
    });
    return;
  }

  await interaction.followUp({
    embeds: [
      buildPresetEmbed(interaction.user.displayName, presetResult.data),
    ],
  });
  await interaction.editReply({
    content: `Shared the **${presetResult.data.presetName}** preset.`,
    components: [],
  });
}
