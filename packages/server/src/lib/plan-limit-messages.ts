import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";

export function soundRuleLimitMessage(limit: number): string {
  return `Your plan allows ${limit} sound rule${limit === 1 ? "" : "s"}. Upgrade your plan for more sound rules.`;
}

export function notificationRuleLimitMessage(limit: number): string {
  return `Your plan allows ${limit} Discord notification rule${limit === 1 ? "" : "s"}. Upgrade your plan for more notification rules.`;
}

export function collectionLimitMessage(limit: number): string {
  return `Your plan allows ${limit} collection${limit === 1 ? "" : "s"}. Upgrade your plan to add more.`;
}

export function sorterLimitMessage(limit: number): string {
  return limit >= MAX_CONNECTED_SORTERS
    ? `At most ${MAX_CONNECTED_SORTERS} sorters can be connected at a time.`
    : `Your plan allows ${limit} connected sorter(s) at a time. Upgrade your plan to connect more.`;
}
