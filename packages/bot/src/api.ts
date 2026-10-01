const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3001";
const BOT_API_SECRET = process.env.BOT_API_SECRET ?? "";

export interface ApiResult<T> {
  success: boolean;
  message?: string;
  data?: T;
}

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

export interface LinkResult {
  orgName?: string;
  currentOrgName?: string;
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

export function getStats(guildId: string, collectionGuid?: string) {
  const query = new URLSearchParams({ guildId });
  if (collectionGuid) query.set("collection", collectionGuid);
  return botFetch<StatsResult>(`/bot/stats?${query.toString()}`);
}

export interface CollectionSummary {
  guid: string | null;
  name: string;
  cardCount: number;
}

export function getCollections(guildId: string) {
  return botFetch<CollectionSummary[]>(
    `/bot/collections?guildId=${encodeURIComponent(guildId)}`,
  );
}

export interface GameSummary {
  key: string;
  name: string;
}

export function getGames() {
  return botFetch<GameSummary[]>("/public/games");
}
