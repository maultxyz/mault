import { MEMBER_SEAT_LIMIT_ERROR_CODE, MEMBER_SEAT_LIMIT_HTTP_STATUS, type MemberSeatLimitErrorBody } from "@magic-vault/shared";
import { ApiStatusError } from "@/lib/api/api-status-error";
import { lockOrgForMemberSeatLimit } from "@/lib/api/member-seat-lock";
import { UpgradeRequiredError } from "@/lib/api/upgrade-required-error";
import { getAccessToken, getActiveOrgId, signOut } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/config";
import type { ApiRequestOptions, RequestAuth } from "@/lib/interfaces/api";

export async function getRequestAuth(): Promise<RequestAuth> {
  return { token: await getAccessToken(), orgId: getActiveOrgId() };
}

export function resolveRequestOrgId(orgId?: string | null): string | null {
  return orgId === undefined ? getActiveOrgId() : orgId;
}

export async function getAuthHeaders(orgId?: string | null): Promise<Record<string, string>> {
  const auth = await getRequestAuth();
  const org = orgId === undefined ? auth.orgId : orgId;
  return {
    ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...(org ? { "X-Org-Id": org } : {}),
  };
}

export function handleForbidden(res: Response): void {
  if (res.status !== 403) return;
  void signOut();
  throw new ApiStatusError(403);
}

export async function trackMemberSeatLimit(res: Response, orgId: string | null): Promise<void> {
  if (!orgId || res.status !== MEMBER_SEAT_LIMIT_HTTP_STATUS) return;
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as Partial<MemberSeatLimitErrorBody> | null;
  if (body?.code !== MEMBER_SEAT_LIMIT_ERROR_CODE) return;
  lockOrgForMemberSeatLimit({ orgId, limit: body.limit ?? 0 });
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, form, orgId, acceptStatuses = [] }: ApiRequestOptions = {},
): Promise<T> {
  const headers = await getAuthHeaders(orgId);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  handleForbidden(res);
  await trackMemberSeatLimit(res, resolveRequestOrgId(orgId));
  if (!res.ok && !acceptStatuses.includes(res.status)) {
    throw new ApiStatusError(res.status);
  }
  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: body ?? {} });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PUT", body: body ?? {} });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

export function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  return apiRequest<T>(path, { method: "POST", form });
}

export async function unwrap<T>(
  request: Promise<{ success: boolean; data?: T; message?: string; upgradeRequired?: boolean }>,
): Promise<T> {
  const result = await request;
  if (!result.success && result.upgradeRequired) {
    throw new UpgradeRequiredError(result.message ?? "Upgrade required.");
  }
  if (!result.success || result.data === undefined) {
    throw new Error(result.message ?? "Request failed.");
  }
  return result.data;
}

export async function unwrapOr<T>(
  request: Promise<{ success: boolean; data?: T | null; message?: string }>,
  fallbackWhenEmpty: T,
): Promise<T> {
  const result = await request;
  if (!result.success) throw new Error(result.message ?? "Request failed.");
  return result.data ?? fallbackWhenEmpty;
}
