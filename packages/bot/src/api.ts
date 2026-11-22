import type {
  ApiResult,
  CalibrationDeviceSummary,
  CollectionSummary,
  DeviceCalibrationResult,
  GameSummary,
  LeaderboardRequest,
  LeaderboardResult,
  LinkAccountResult,
  LinkResult,
  RulePresetResult,
  RulePresetSummary,
  ShowcaseKind,
  ShowcaseResult,
  ShowcaseTarget,
  ShowoffResult,
  StatsResult,
} from "./lib/interfaces";
import {
  BOT_API_SECRET,
  DEFAULT_LEADERBOARD_PERIOD,
  DEFAULT_LEADERBOARD_RANKING,
  LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM,
  LEADERBOARD_METRIC_PARAM,
  LEADERBOARD_PERIOD_PARAM,
  SERVER_URL,
} from "./lib/constants";

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

export function getShowcaseTargets(
  discordUserId: string,
  guildId: string | null,
  kind: ShowcaseKind,
  nameQuery: string,
) {
  const query = new URLSearchParams({ discordUserId, kind, query: nameQuery });
  if (guildId) query.set("guildId", guildId);
  return botFetch<ShowcaseTarget[]>(`/bot/showcase-targets?${query.toString()}`);
}

export function getShowcase(
  discordUserId: string,
  kind: ShowcaseKind,
  guid: string,
) {
  const query = new URLSearchParams({ discordUserId, kind, guid });
  return botFetch<ShowcaseResult>(`/bot/showcase?${query.toString()}`);
}

export function getLeaderboard({
  guildId,
  ranking,
  period,
  includeSelfHosted,
}: LeaderboardRequest) {
  const query = new URLSearchParams();
  if (guildId) query.set("guildId", guildId);
  if (ranking !== DEFAULT_LEADERBOARD_RANKING) {
    query.set(LEADERBOARD_METRIC_PARAM, ranking);
  }
  if (period !== DEFAULT_LEADERBOARD_PERIOD) {
    query.set(LEADERBOARD_PERIOD_PARAM, period);
  }
  if (includeSelfHosted) query.set(LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM, "true");
  const queryString = query.toString();
  return botFetch<LeaderboardResult>(
    `/bot/leaderboard${queryString ? `?${queryString}` : ""}`,
  );
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
