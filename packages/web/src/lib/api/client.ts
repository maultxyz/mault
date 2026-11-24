import { ApiStatusError } from "@/lib/api/api-status-error";
import { neon } from "@/lib/auth/client";
import {
  clearImpersonation,
  getImpersonationState,
} from "@/lib/auth/impersonation";
import { setLocalToken } from "@/lib/auth/local-token";
import {
  getAuthSession,
  getOrgId,
  refreshAuthTokenRejectedByApi,
} from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/api";
import type {
  ApiPostFormOptions,
  AuthenticatedRequestInit,
  AuthenticatedResponse,
} from "@/lib/interfaces/api-client";
import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { readMemberSeatLimit, setMemberSeatLock } from "@/lib/member-seat-lock";
import { getPlanPreview } from "@/lib/plan-preview";
import {
  MEMBER_SEAT_LIMIT_HTTP_STATUS,
  PLAN_PREVIEW_HEADER,
} from "@magic-vault/shared";


export async function getRequestAuth(): Promise<{
  token: string | null;
  orgId: string | null;
}> {
  const impersonation = getImpersonationState();
  if (impersonation) {
    return {
      token: impersonation.token,
      orgId: impersonation.activeOrgId ?? null,
    };
  }
  const session = await getAuthSession();
  return { token: session?.token ?? null, orgId: getOrgId(session) };
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const { token, orgId } = await getRequestAuth();
  const planPreview = getPlanPreview();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { "X-Org-Id": orgId } : {}),
    ...(planPreview ? { [PLAN_PREVIEW_HEADER]: planPreview } : {}),
  };
}

let forbiddenHandled = false;

async function handleMemberSeatLimit(res: Response): Promise<void> {
  if (res.status !== MEMBER_SEAT_LIMIT_HTTP_STATUS) return;
  const limit = await readMemberSeatLimit(res);
  if (limit == null) return;
  const { orgId } = await getRequestAuth();
  if (orgId) setMemberSeatLock({ orgId, limit });
  throw new ApiStatusError(res.status);
}

export async function handleForbidden(res: Response): Promise<void> {
  await handleMemberSeatLimit(res);
  if (res.status !== 403) return;
  if (!forbiddenHandled) {
    forbiddenHandled = true;
    if (AUTH_PROVIDER === "local") {
      setLocalToken(null);
    } else {
      await neon.auth.signOut();
    }
    window.location.href = "/auth/sign-in";
  }
  throw new ApiStatusError(403);
}

async function checkResponse(
  res: Response,
  wasImpersonating: boolean,
): Promise<void> {
  if ((res.status === 401 || res.status === 403) && wasImpersonating) {
    clearImpersonation();
    throw new Error(`API error: ${res.status}`);
  }
  await handleForbidden(res);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchWithAuthRetry(
  path: string,
  init: AuthenticatedRequestInit = {},
): Promise<AuthenticatedResponse> {
  const wasImpersonating = !!getImpersonationState();
  const sendRequest = async (authHeaders: Record<string, string>) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...authHeaders, ...init.headers },
    });
  const authHeaders = (await getAuthHeaders()) as Record<string, string>;
  const res = await sendRequest(authHeaders);
  const rejectedToken = authHeaders.Authorization?.slice("Bearer ".length);
  if (res.status !== 401 || wasImpersonating || !rejectedToken) {
    return { res, wasImpersonating };
  }
  const refreshedToken = await refreshAuthTokenRejectedByApi(rejectedToken);
  if (!refreshedToken) return { res, wasImpersonating };
  return {
    res: await sendRequest({ ...authHeaders, Authorization: `Bearer ${refreshedToken}` }),
    wasImpersonating,
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path);
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiGetBlob(path: string): Promise<Blob> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path);
  await checkResponse(res, wasImpersonating);
  return res.blob();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiPostBlob(path: string, body: unknown): Promise<Blob> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await checkResponse(res, wasImpersonating);
  return res.blob();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path, { method: "DELETE" });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiPostForm<T>(
  path: string,
  formData: FormData,
  { timeoutMs, reportsHttpStatus = false }: ApiPostFormOptions = {},
): Promise<T> {
  const { res, wasImpersonating } = await fetchWithAuthRetry(path, {
    method: "POST",
    body: formData,
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  });
  try {
    await checkResponse(res, wasImpersonating);
  } catch (error) {
    if (reportsHttpStatus && !(error instanceof ApiStatusError)) {
      throw new ApiStatusError(res.status);
    }
    throw error;
  }
  return res.json();
}
