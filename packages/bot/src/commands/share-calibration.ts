import {
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getCalibrationDevices, getDeviceCalibration } from "../api";
import { ACCOUNT_NOT_LINKED_MESSAGE, DISCORD_BLURPLE } from "../lib/constants";
import type {
  CalibrationDeviceSummary,
  DeviceCalibrationResult,
} from "../lib/interfaces";
import { promptForSelection } from "../lib/select-prompt";

export const data = new SlashCommandBuilder()
  .setName("share-calibration")
  .setDescription("Share one of your sorters' calibration values")
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);

function describeDevice(device: CalibrationDeviceSummary) {
  const modules = `${device.moduleCount} ${device.moduleCount === 1 ? "module" : "modules"}`;
  return device.orgName ? `${device.orgName} · ${modules}` : modules;
}

function formatCalibrationRows(rows: [string, string][]) {
  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  return `\`\`\`\n${rows
    .map(([label, value]) => `${label.padEnd(labelWidth)}  ${value}`)
    .join("\n")}\n\`\`\``;
}

function buildCalibrationEmbed(
  sharedBy: string,
  calibration: DeviceCalibrationResult,
) {
  const embed = new EmbedBuilder()
    .setTitle(`${calibration.deviceName} calibration`)
    .setColor(DISCORD_BLURPLE)
    .setDescription(
      `Shared by **${sharedBy}** · ${calibration.moduleCount} ${
        calibration.moduleCount === 1 ? "module" : "modules"
      } · servo values are raw PWM pulses`,
    );

  for (const { moduleNumber, calibration: servo } of calibration.modules) {
    embed.addFields({
      name: `Module ${moduleNumber}`,
      value: formatCalibrationRows([
        ["Trapdoor closed/open", `${servo.bottomClosed} / ${servo.bottomOpen}`],
        ["Paddle closed/open", `${servo.paddleClosed} / ${servo.paddleOpen}`],
        [
          "Pusher left/neutral/right",
          `${servo.pusherLeft} / ${servo.pusherNeutral} / ${servo.pusherRight}`,
        ],
        ["Pusher hold", `${servo.pusherHoldDuration} ms`],
        [
          "Paddle close/open delay",
          `${servo.paddleCloseDelay} / ${servo.paddleOpenDelay} ms`,
        ],
      ]),
    });
  }

  const { feeder } = calibration;
  embed.addFields({
    name: "Feeder",
    value: formatCalibrationRows([
      ["Speed", `${feeder.speed}`],
      ["Duration", `${feeder.duration} ms`],
      ["Pulse/pause", `${feeder.pulseDuration} / ${feeder.pauseDuration} ms`],
      ["Settle", `${feeder.settleDuration} ms`],
      ["Reverse speed", `${feeder.reverseSpeed}`],
      ["Reverse duration", `${feeder.reverseDuration} ms`],
    ]),
  });

  return embed;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const devicesResult = await getCalibrationDevices(
    interaction.user.id,
    interaction.guildId,
  );
  if (!devicesResult.success || !devicesResult.data) {
    await interaction.editReply(
      devicesResult.message === "account_not_linked"
        ? ACCOUNT_NOT_LINKED_MESSAGE
        : "Couldn't load your sorters.",
    );
    return;
  }
  if (devicesResult.data.length === 0) {
    await interaction.editReply(
      "You don't have any sorters in your Mault organizations yet.",
    );
    return;
  }

  const devicesByGuid = new Map(
    devicesResult.data.map((device) => [device.guid, device]),
  );
  const pickedGuid = await promptForSelection(interaction, {
    customId: "share-calibration-device",
    prompt: "Which sorter's calibration do you want to share?",
    placeholder: "Pick a sorter to share",
    options: devicesResult.data.map((device) => ({
      label: device.name,
      description: describeDevice(device),
      value: device.guid,
    })),
    timeoutMessage:
      "Timed out. Run `/share-calibration` again to share a sorter.",
  });
  if (!pickedGuid) return;

  const calibrationResult = await getDeviceCalibration(
    interaction.user.id,
    pickedGuid,
  );
  if (!calibrationResult.success || !calibrationResult.data) {
    await interaction.editReply({
      content:
        calibrationResult.message === "device_not_found"
          ? "That sorter is no longer available."
          : "Couldn't load that sorter's calibration.",
      components: [],
    });
    return;
  }

  await interaction.followUp({
    embeds: [
      buildCalibrationEmbed(
        interaction.user.displayName,
        calibrationResult.data,
      ),
    ],
  });
  await interaction.editReply({
    content: `Shared the calibration for **${
      devicesByGuid.get(pickedGuid)?.name ?? calibrationResult.data.deviceName
    }**.`,
    components: [],
  });
}
