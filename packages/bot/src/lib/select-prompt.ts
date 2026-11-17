import {
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  DISCORD_SELECT_LABEL_MAX_LENGTH,
  SHARE_PICK_TIMEOUT_MS,
} from "./constants";
import type { SelectPromptRequest } from "./interfaces";

export function truncateSelectText(text: string) {
  return text.length > DISCORD_SELECT_LABEL_MAX_LENGTH
    ? `${text.slice(0, DISCORD_SELECT_LABEL_MAX_LENGTH - 3)}...`
    : text;
}

export async function promptForSelection(
  interaction: ChatInputCommandInteraction,
  request: SelectPromptRequest,
): Promise<string | null> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(request.customId)
    .setPlaceholder(request.placeholder)
    .addOptions(
      request.options.map((option) => ({
        label: truncateSelectText(option.label),
        description: option.description
          ? truncateSelectText(option.description)
          : undefined,
        value: option.value,
      })),
    );
  const message = await interaction.editReply({
    content: request.prompt,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
  });

  try {
    const picked = await message.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: SHARE_PICK_TIMEOUT_MS,
      filter: (i) => i.user.id === interaction.user.id,
    });
    await picked.deferUpdate();
    return picked.values[0];
  } catch {
    await interaction.editReply({
      content: request.timeoutMessage,
      components: [],
    });
    return null;
  }
}
