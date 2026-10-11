import type {
  ApiResult,
  CollectionSummary,
  GameSummary,
  LinkResult,
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

export function getCollections(guildId: string) {
  return botFetch<CollectionSummary[]>(
    `/bot/collections?guildId=${encodeURIComponent(guildId)}`,
  );
}

export function getGames() {
  return botFetch<GameSummary[]>("/public/games");
}
