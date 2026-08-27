import { neon } from "@/lib/auth/client";
import {
  clearImpersonation,
  getImpersonationState,
} from "@/lib/auth/impersonation";
import { setLocalToken } from "@/lib/auth/local-token";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { getAuthSession, getOrgId } from "@/lib/auth/session";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function getAuthHeaders(): Promise<HeadersInit> {
  const impersonation = getImpersonationState();
  if (impersonation) {
    return {
      Authorization: `Bearer ${impersonation.token}`,
      ...(impersonation.activeOrgId
        ? { "X-Org-Id": impersonation.activeOrgId }
        : {}),
    };
  }

  const session = await getAuthSession();
  const token = session?.token;
  const orgId = getOrgId(session);
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { "X-Org-Id": orgId } : {}),
  };
}

let forbiddenHandled = false;

export async function handleForbidden(res: Response): Promise<void> {
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
  throw new Error("API error: 403");
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

export async function apiGet<T>(path: string): Promise<T> {
  const wasImpersonating = !!getImpersonationState();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(await getAuthHeaders()) },
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const wasImpersonating = !!getImpersonationState();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const wasImpersonating = !!getImpersonationState();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const wasImpersonating = !!getImpersonationState();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...(await getAuthHeaders()) },
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}

export async function apiPostForm<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const wasImpersonating = !!getImpersonationState();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...(await getAuthHeaders()) },
    body: formData,
  });
  await checkResponse(res, wasImpersonating);
  return res.json();
}
