import type {
  ApiResult,
  CalibrationDeviceSummary,
  CollectionSummary,
  DeviceCalibrationResult,
  GameSummary,
  LeaderboardResult,
  LinkAccountResult,
  LinkResult,
  RulePresetResult,
  RulePresetSummary,
  ShowoffResult,
  StatsResult,
} from "./lib/interfaces";
import { BOT_API_SECRET, SERVER_URL } from "./lib/constants";

async function botFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Secret": BOT_API_SECRET,
      ...init?.headers,
    },
  });
  return res.json();
}

export function linkGuild(guildId: string, code: string, confirm = false) {
  return botFetch<LinkResult>("/bot/link", {
    method: "POST",
    body: JSON.stringify({ guildId, code, confirm }),
  });
}

export function linkAccount(
  discordUserId: string,
  discordUsername: string,
  code: string,
) {
  return botFetch<LinkAccountResult>("/bot/link-account", {
    method: "POST",
    body: JSON.stringify({ discordUserId, discordUsername, code }),
  });
}

export function unlinkGuild(guildId: string) {
  return botFetch<undefined>("/bot/unlink", {
    method: "POST",
    body: JSON.stringify({ guildId }),
  });
}

export function getStats(guildId: string, collectionGuid?: string) {
  const query = new URLSearchParams({ guildId });
  if (collectionGuid) query.set("collection", collectionGuid);
  return botFetch<StatsResult>(`/bot/stats?${query.toString()}`);
}

export function getShowoff(discordUserId: string, guildId: string | null) {
  const query = new URLSearchParams({ discordUserId });
  if (guildId) query.set("guildId", guildId);
  return botFetch<ShowoffResult>(`/bot/showoff?${query.toString()}`);
}

export function getLeaderboard(guildId: string | null) {
  const query = guildId ? `?guildId=${encodeURIComponent(guildId)}` : "";
  return botFetch<LeaderboardResult>(`/bot/leaderboard${query}`);
}

export function getCollections(guildId: string) {
  return botFetch<CollectionSummary[]>(
    `/bot/collections?guildId=${encodeURIComponent(guildId)}`,
  );
}

export function getGames() {
  return botFetch<GameSummary[]>("/public/games");
}

export function getCalibrationDevices(
  discordUserId: string,
  guildId: string | null,
) {
  const query = new URLSearchParams({ discordUserId });
  if (guildId) query.set("guildId", guildId);
  return botFetch<CalibrationDeviceSummary[]>(
    `/bot/calibration-devices?${query.toString()}`,
  );
}

export function getDeviceCalibration(discordUserId: string, deviceGuid: string) {
  const query = new URLSearchParams({ discordUserId, deviceGuid });
  return botFetch<DeviceCalibrationResult>(
    `/bot/calibration?${query.toString()}`,
  );
}

export function getRulePresets(discordUserId: string, guildId: string | null) {
  const query = new URLSearchParams({ discordUserId });
  if (guildId) query.set("guildId", guildId);
  return botFetch<RulePresetSummary[]>(`/bot/rule-presets?${query.toString()}`);
}

export function getRulePreset(discordUserId: string, presetGuid: string) {
  const query = new URLSearchParams({ discordUserId, presetGuid });
  return botFetch<RulePresetResult>(`/bot/rule-preset?${query.toString()}`);
}
