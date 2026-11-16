import { dehydrate, hydrate, type Query, type QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { AppState } from "react-native";
import { getSessionSnapshot, subscribeToSession } from "@/lib/auth/session";
import {
  PERSISTED_GLOBAL_QUERY_ROOT_KEYS,
  PERSISTED_ORG_QUERY_ROOT_KEYS,
  QUERY_CACHE_SNAPSHOT_MAX_AGE_MS,
  QUERY_CACHE_SNAPSHOT_WRITE_DELAY_MS,
} from "@/lib/constants/query";
import { QUERY_CACHE_SNAPSHOT_KEY } from "@/lib/constants/storage-keys";
import type { QueryCacheScope, QueryCacheSnapshot } from "@/lib/interfaces/query";
import { readKvJson, writeKv, writeKvJson } from "@/lib/storage/kv";

const queryCacheSnapshotAppVersion = Constants.expoConfig?.version ?? "";
let isQueryCachePersistenceStarted = false;

function currentQueryCacheScope(): QueryCacheScope | null {
  const { status, user, activeOrgId } = getSessionSnapshot();
  return status === "signed-in" && user && activeOrgId ? { userId: user.id, orgId: activeOrgId } : null;
}

function isSameQueryCacheScope(first: QueryCacheScope | null, second: QueryCacheScope | null): boolean {
  return !!first && !!second && first.userId === second.userId && first.orgId === second.orgId;
}

function isPersistedQuery(query: Query, scope: QueryCacheScope): boolean {
  const [rootKey, scopeKey] = query.queryKey;
  if (query.state.status !== "success" || typeof rootKey !== "string") return false;
  if (query.queryKey.length === 1) return PERSISTED_GLOBAL_QUERY_ROOT_KEYS.has(rootKey);
  return PERSISTED_ORG_QUERY_ROOT_KEYS.has(rootKey) && scopeKey === scope.orgId;
}

function clearQueryCacheSnapshot(): void {
  writeKv(QUERY_CACHE_SNAPSHOT_KEY, null);
}

function restoreQueryCacheSnapshot(queryClient: QueryClient, scope: QueryCacheScope): void {
  const snapshot = readKvJson<QueryCacheSnapshot | null>(QUERY_CACHE_SNAPSHOT_KEY, null);
  if (!snapshot) return;
  const isUsable =
    snapshot.appVersion === queryCacheSnapshotAppVersion &&
    isSameQueryCacheScope(snapshot, scope) &&
    Date.now() - snapshot.savedAt < QUERY_CACHE_SNAPSHOT_MAX_AGE_MS;
  if (!isUsable) {
    clearQueryCacheSnapshot();
    return;
  }
  try {
    hydrate(queryClient, snapshot.dehydratedState);
  } catch {
    clearQueryCacheSnapshot();
  }
}

function writeQueryCacheSnapshot(queryClient: QueryClient): void {
  const scope = currentQueryCacheScope();
  if (!scope) return;
  const dehydratedState = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => isPersistedQuery(query, scope),
    shouldDehydrateMutation: () => false,
  });
  writeKvJson(QUERY_CACHE_SNAPSHOT_KEY, {
    ...scope,
    appVersion: queryCacheSnapshotAppVersion,
    savedAt: Date.now(),
    dehydratedState,
  } satisfies QueryCacheSnapshot);
}

export function startQueryCachePersistence(queryClient: QueryClient): void {
  if (isQueryCachePersistenceStarted) return;
  isQueryCachePersistenceStarted = true;
  let restoredScope: QueryCacheScope | null = null;
  let wasSignedIn = false;
  let scheduledWrite: ReturnType<typeof setTimeout> | null = null;

  const cancelScheduledWrite = () => {
    if (scheduledWrite) clearTimeout(scheduledWrite);
    scheduledWrite = null;
  };

  const flushScheduledWrite = () => {
    if (!scheduledWrite) return;
    cancelScheduledWrite();
    writeQueryCacheSnapshot(queryClient);
  };

  const handleSessionChange = () => {
    const { status } = getSessionSnapshot();
    if (status === "loading") return;
    if (status === "signed-out") {
      cancelScheduledWrite();
      clearQueryCacheSnapshot();
      if (wasSignedIn) queryClient.clear();
      wasSignedIn = false;
      restoredScope = null;
      return;
    }
    wasSignedIn = true;
    const scope = currentQueryCacheScope();
    if (!scope || isSameQueryCacheScope(scope, restoredScope)) return;
    cancelScheduledWrite();
    restoredScope = scope;
    restoreQueryCacheSnapshot(queryClient, scope);
  };

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success" || scheduledWrite) return;
    const scope = currentQueryCacheScope();
    if (!scope || !isPersistedQuery(event.query, scope)) return;
    scheduledWrite = setTimeout(() => {
      scheduledWrite = null;
      writeQueryCacheSnapshot(queryClient);
    }, QUERY_CACHE_SNAPSHOT_WRITE_DELAY_MS);
  });
  AppState.addEventListener("change", (state) => {
    if (state !== "active") flushScheduledWrite();
  });
  subscribeToSession(handleSessionChange);
  handleSessionChange();
}
