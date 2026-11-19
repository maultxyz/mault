import type { DehydratedState } from "@tanstack/react-query";

export interface QueryCacheScope {
  userId: string;
  orgId: string;
}

export interface QueryCacheSnapshot extends QueryCacheScope {
  appVersion: string;
  savedAt: number;
  dehydratedState: DehydratedState;
}
