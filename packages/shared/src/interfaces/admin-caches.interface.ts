export interface AdminClearCachesResult {
  clearedCacheCount: number;
}

export interface AdminCacheSummary {
  name: string;
  entryCount: number;
}

export interface AdminCacheKeysPage {
  name: string;
  keys: string[];
  matchingKeyCount: number;
}

export interface AdminClearCacheEntriesResult {
  clearedEntryCount: number;
}
