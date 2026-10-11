import type {
  APIEmbed,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface GuildChannelSummary {
  id: string;
  name: string;
  type: "text" | "announcement";
  categoryName: string | null;
  missingPermissions: string[];
}

export interface GuildRoleSummary {
  id: string;
  name: string;
  color: string | null;
  canPing: boolean;
}

export interface ApiResult<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LinkResult {
  orgName?: string;
  currentOrgName?: string;
}

export interface TopCardSummary {
  name: string;
  setName: string | null;
  foil: string | null;
  collectionName: string;
  priceDisplay: string;
  imageUrl: string | null;
}

export interface StatsResult {
  collectionCount: number;
  cardCount: number;
  totalValue: number;
  totalValueDisplay?: string;
  collectionName?: string;
  topCard: TopCardSummary | null;
}

export interface CollectionSummary {
  guid: string | null;
  name: string;
  cardCount: number;
}

export interface GameSummary {
  key: string;
  name: string;
}

export interface NotifyBody {
  channelId?: string;
  threadId?: string | null;
  threadName?: string | null;
  useThread?: boolean;
  embed?: APIEmbed;
  attachmentDataUrl?: string;
  secondaryImageUrl?: string;
  guildId?: string;
  pingRoleIds?: string[];
}

export interface BotCommand {
  data:
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
