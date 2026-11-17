const incompleteFetchReasons = new Set<string>();

export function markSyncFetchIncomplete(reason: string): void {
  incompleteFetchReasons.add(reason);
}

export function syncFetchIncompleteReasons(): string[] {
  return [...incompleteFetchReasons];
}

export function resetSyncFetchCompleteness(): void {
  incompleteFetchReasons.clear();
}
