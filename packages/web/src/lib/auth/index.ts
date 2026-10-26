import { apiPost, getAuthHeaders } from "@/lib/api/client";
import { neon } from "@/lib/auth/client";
import { localPost } from "@/lib/auth/local-api";
import { getLocalToken, setLocalToken } from "@/lib/auth/local-token";
import {
  notifyLocalSessionChanged,
  useLocalAuthSession,
} from "@/lib/auth/local-session-store";
import { PENDING_INVITE_STORAGE_KEY as PENDING_INVITE_KEY } from "@/lib/constants/storage-keys";
import type { LocalAuthResult } from "@/lib/interfaces/auth";
import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { API_BASE } from "@/lib/constants/api";


export const useAuthSession =
  AUTH_PROVIDER === "local"
    ? useLocalAuthSession
    : () => neon.auth.useSession();


export function savePendingInviteToken(token: string): void {
  localStorage.setItem(PENDING_INVITE_KEY, token);
}

async function acceptPendingInviteIfAny(): Promise<void> {
  const token = localStorage.getItem(PENDING_INVITE_KEY);
  if (!token) return;
  localStorage.removeItem(PENDING_INVITE_KEY);
  const result = await localPost<{ success: boolean; message?: string }>(
    "/api/local-auth/invites/accept",
    { token },
  );
  if (!result.success) {
    throw new Error(result.message ?? "The invite couldn't be accepted.");
  }
}

function pendingInviteError(error: unknown): { error: string } {
  console.error("Accepting the pending invite failed", error);
  return {
    error:
      "You're signed in, but the invite couldn't be accepted. Open the invite link again.",
  };
}

export async function signInLocal(
  email: string,
  password: string,
): Promise<{ error: string } | { error?: undefined }> {
  try {
    const res = await localPost<{
      success: boolean;
      data?: LocalAuthResult;
      message?: string;
    }>("/api/local-auth/sign-in", { email, password });
    if (!res.success || !res.data) {
      return { error: res.message ?? "Sign in failed." };
    }
    setLocalToken(res.data.token);
    notifyLocalSessionChanged();
    try {
      await acceptPendingInviteIfAny();
    } catch (error) {
      return pendingInviteError(error);
    }
    return {};
  } catch {
    return { error: "Couldn't reach the server. Please try again." };
  }
}

export async function signUpLocal(
  email: string,
  password: string,
  name: string,
): Promise<{ error: string } | { error?: undefined }> {
  try {
    const res = await localPost<{
      success: boolean;
      data?: LocalAuthResult;
      message?: string;
    }>("/api/local-auth/sign-up", { email, password, name });
    if (!res.success || !res.data) {
      return { error: res.message ?? "Sign up failed." };
    }
    setLocalToken(res.data.token);
    notifyLocalSessionChanged();
    try {
      await acceptPendingInviteIfAny();
    } catch (error) {
      return pendingInviteError(error);
    }
    await apiPost("/api/local-auth/bootstrap").catch((error) =>
      console.error("Creating the first organization failed", error),
    );
    return {};
  } catch {
    return { error: "Couldn't reach the server. Please try again." };
  }
}

export async function signOut(): Promise<void> {
  if (AUTH_PROVIDER === "local") {
    if (getLocalToken()) {
      await apiPost("/api/local-auth/sign-out").catch(() => {});
    }
    setLocalToken(null);
    notifyLocalSessionChanged();
    return;
  }
  await neon.auth.signOut();
}

async function ensureDeviceForOrg(orgId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
        "X-Org-Id": orgId,
      },
    });
    if (!response.ok) {
      console.error(`Creating the new org's device failed (${response.status})`);
    }
  } catch (error) {
    console.error("Creating the new org's device failed", error);
  }
}

export async function createOrganization(
  name: string,
): Promise<{ id: string; name: string } | { error: string }> {
  if (AUTH_PROVIDER === "local") {
    try {
      const res = await localPost<{
        success: boolean;
        data?: { id: string; name: string };
        message?: string;
      }>("/api/local-auth/organizations", { name });
      if (!res.success || !res.data) {
        return { error: res.message ?? "Failed to create organization." };
      }
      return res.data;
    } catch {
      return { error: "Couldn't reach the server. Please try again." };
    }
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  try {
    const { data, error } = await neon.auth.organization.create({
      name: name.trim(),
      slug,
    });
    if (error) {
      return { error: error.message ?? "Failed to create organization." };
    }
    if (!data) return { error: "Failed to create organization." };
    await ensureDeviceForOrg(data.id);
    return { id: data.id, name: data.name };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : null;
    return { error: message || "Failed to create organization." };
  }
}
