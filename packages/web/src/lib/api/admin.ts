import { API_BASE, apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { getAuthSession } from "@/lib/auth/session";
import type {
  AdminUserSummary,
  ImpersonationAuditEntry,
  ImpersonationSession,
  Result,
  SyncState,
} from "@magic-vault/shared";

export interface AdminCard {
  id: number;
  cardId: string;
  gameKey: string;
  lang: string;
  name: string;
  setCode: string;
  updatedAt: string;
}

export interface AdminCardsPage {
  cards: AdminCard[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncSourceInfo {
  gameKey: string;
  label: string;
  languages: string[];
}

export async function listSyncSources(): Promise<{
  success: boolean;
  data: SyncSourceInfo[];
}> {
  return apiGet<{ success: boolean; data: SyncSourceInfo[] }>("/api/admin/sync/sources");
}

export async function startSync(gameKey: string, lang: string = "en"): Promise<{
  success: boolean;
  data: SyncState;
}> {
  return apiPost<{ success: boolean; data: SyncState }>("/api/admin/sync", {
    gameKey,
    lang,
  });
}

export async function cancelSync(): Promise<{
  success: boolean;
  data: SyncState;
}> {
  return apiDelete<{ success: boolean; data: SyncState }>("/api/admin/sync");
}

export async function getSyncStatus(): Promise<{
  success: boolean;
  data: SyncState;
}> {
  return apiGet<{ success: boolean; data: SyncState }>("/api/admin/sync");
}

export interface CardGameCount {
  gameKey: string;
  count: number;
}

export async function listCardGameKeys(): Promise<{
  success: boolean;
  data: CardGameCount[];
}> {
  return apiGet<{ success: boolean; data: CardGameCount[] }>(
    "/api/admin/cards/games",
  );
}

export async function dumpCards(
  gameKey?: string,
): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>(
    "/api/admin/cards/dump",
    gameKey ? { gameKey } : undefined,
  );
}

export async function listCards(
  page: number,
  search: string,
): Promise<{ success: boolean; data: AdminCardsPage }> {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (search) params.set("search", search);
  return apiGet<{ success: boolean; data: AdminCardsPage }>(`/api/admin/cards?${params}`);
}

export async function revectorizeCard(
  cardId: string,
): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>(
    `/api/admin/cards/${encodeURIComponent(cardId)}/revectorize`,
  );
}

export async function syncCardById(
  gameKey: string,
  cardId: string,
  lang: string = "en",
): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>("/api/admin/cards/sync", {
    gameKey,
    cardId,
    lang,
  });
}

export async function createSyncEventSource(): Promise<EventSource> {
  const session = await getAuthSession();
  const url = `${API_BASE}/api/admin/sync/stream${session?.token ? `?token=${encodeURIComponent(session.token)}` : ""}`;
  return new EventSource(url);
}

export async function searchAdminUsers(
  search: string,
): Promise<Result<AdminUserSummary[]>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  return apiGet<Result<AdminUserSummary[]>>(`/api/admin/users?${params}`);
}

export async function startImpersonation(
  userId: string,
): Promise<Result<ImpersonationSession>> {
  return apiPost<Result<ImpersonationSession>>(
    `/api/admin/impersonate/${encodeURIComponent(userId)}`,
  );
}

export async function listImpersonationAudit(): Promise<
  Result<ImpersonationAuditEntry[]>
> {
  return apiGet<Result<ImpersonationAuditEntry[]>>(
    "/api/admin/impersonation-audit",
  );
}

export async function stopImpersonation(): Promise<Result<null>> {
  return apiPost<Result<null>>("/api/admin/impersonate/stop");
}

export async function testServerRollbar(): Promise<{
  success: boolean;
  message: string;
}> {
  return apiPost<{ success: boolean; message: string }>(
    "/api/admin/rollbar/test",
  );
}
