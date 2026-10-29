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
  canAssign: boolean;
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

export interface LinkAccountResult {
  userName: string | null;
}

export interface MemberRoleBody {
  guildId?: string;
  userId?: string;
  roleId?: string;
  action?: "add" | "remove";
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

export interface LeaderboardRow {
  rank: number;
  name: string | null;
  scanCount: number;
  isOwnOrg: boolean;
  isAnonymous: boolean;
}

export interface LeaderboardResult {
  rows: LeaderboardRow[];
  size: number;
  linkedOrgOptedIn: boolean | null;
}

export interface ShowoffResult extends StatsResult {
  orgName: string;
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

export interface CalibrationDeviceSummary {
  guid: string;
  name: string;
  orgName: string;
  moduleCount: number;
}

export interface ServoCalibrationValues {
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
  pusherHoldDuration: number;
  paddleCloseDelay: number;
  paddleOpenDelay: number;
}

export interface FeederCalibrationValues {
  speed: number;
  duration: number;
  pulseDuration: number;
  pauseDuration: number;
  settleDuration: number;
  reverseSpeed: number;
  reverseDuration: number;
}

export interface DeviceCalibrationResult {
  deviceName: string;
  moduleCount: number;
  modules: { moduleNumber: number; calibration: ServoCalibrationValues }[];
  feeder: FeederCalibrationValues;
}

export interface RulePresetSummary {
  guid: string;
  name: string;
  orgName: string;
  gameName: string | null;
  isActive: boolean;
}

export interface RulePresetResult {
  presetName: string;
  gameName: string | null;
  modeLabel: string | null;
  binLines: string[];
}

export interface SelectPromptOption {
  label: string;
  description: string;
  value: string;
}

export interface SelectPromptRequest {
  customId: string;
  prompt: string;
  placeholder: string;
  options: SelectPromptOption[];
  timeoutMessage: string;
}
