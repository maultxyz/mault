import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type SlashCommandOptionsOnlyBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import * as clear from "./commands/clear";
import * as help from "./commands/help";
import * as link from "./commands/link";
import * as notification from "./commands/notification";
import * as scanning from "./commands/scanning";
import * as stats from "./commands/stats";
import * as status from "./commands/status";
import { startNotifyServer } from "./notify-server";
import { startPresenceCycle } from "./presence";

interface BotCommand {
  data:
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DEV_GUILD_ID = process.env.DISCORD_DEV_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  throw new Error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set.");
}

const commands: BotCommand[] = [
  link,
  stats,
  status,
  notification,
  scanning,
  clear,
  help,
];
const commandsByName = new Map(commands.map((c) => [c.data.name, c]));
const commandBodies = commands.map((c) => c.data.toJSON());

const rest = new REST().setToken(TOKEN);

async function registerCommands() {
  if (DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, DEV_GUILD_ID), {
      body: commandBodies,
    });
    console.log(
      `[bot] Registered ${commands.length} commands to dev guild ${DEV_GUILD_ID}.`,
    );
    return;
  }
  await rest.put(Routes.applicationCommands(CLIENT_ID!), {
    body: commandBodies,
  });
  console.log(
    `[bot] Registered ${commands.length} global commands (can take up to an hour to appear everywhere).`,
  );
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[bot] Logged in as ${readyClient.user.tag}`);
  startPresenceCycle(readyClient);
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, guild.id), {
      body: commandBodies,
    });
  } catch (err) {
    console.error(
      `[bot] Failed to register commands for new guild ${guild.id}:`,
      err,
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commandsByName.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error(
        `[bot] Error in autocomplete for /${interaction.commandName}:`,
        err,
      );
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = commandsByName.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    console.error(`[bot] Error running /${interaction.commandName}:`, err);
    const message = "Something went wrong running that command.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction
        .reply({ content: message, flags: MessageFlags.Ephemeral })
        .catch(() => {});
    }
  }
});

async function main() {
  await registerCommands();
  await client.login(TOKEN);
  startNotifyServer(client);
}

main().catch((err) => {
  console.error("[bot] Failed to start:", err);
  process.exitCode = 1;
});
