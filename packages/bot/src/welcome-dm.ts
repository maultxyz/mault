import { EmbedBuilder, type GuildMember } from "discord.js";
import {
  ACCOUNT_SETTINGS_PATH,
  DISCORD_BLURPLE,
  DISCORD_LINK_CODE_TTL_MINUTES,
  WEB_URL,
  WELCOME_GUILD_IDS,
} from "./lib/constants";

function buildWelcomeEmbed(guildName: string) {
  const accountSettingsUrl = new URL(ACCOUNT_SETTINGS_PATH, WEB_URL).toString();
  return new EmbedBuilder()
    .setColor(DISCORD_BLURPLE)
    .setTitle(`Welcome to ${guildName}!`)
    .setDescription(
      [
        "Link your Discord account to Mault so the bot knows who you are and gives you your role in this server.",
        "",
        `**1.** Sign in to Mault and open [Account settings](${accountSettingsUrl}).`,
        "**2.** Under **Discord account**, click **Generate link code**.",
        "**3.** Run `/link-account code:<your code>` in the server or right here in this DM.",
        "",
        `Codes expire after ${DISCORD_LINK_CODE_TTL_MINUTES} minutes, so generate a new one if yours stops working.`,
      ].join("\n"),
    );
}

export async function sendWelcomeDm(member: GuildMember) {
  if (member.user.bot || !WELCOME_GUILD_IDS.has(member.guild.id)) return;
  try {
    await member.send({ embeds: [buildWelcomeEmbed(member.guild.name)] });
  } catch (err) {
    console.warn(
      `[bot] Couldn't send the welcome DM to ${member.user.id} in ${member.guild.id}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
