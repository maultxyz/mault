import { apiPost } from "@/lib/api/client";
import { neon } from "@/lib/auth/client";
import { localPost } from "@/lib/auth/local-api";
import {
  notifyLocalSessionChanged,
  useLocalAuthSession,
} from "@/lib/auth/local-session-store";
import { getLocalToken, setLocalToken } from "@/lib/auth/local-token";
import { AUTH_PROVIDER } from "@/lib/auth/provider";

export { AUTH_PROVIDER };

// Same return shape as Neon's neon.auth.useSession() - data.user.{id,name,
// email,role} - so call sites (use-role.ts, user-menu.tsx, nav components)
// don't need provider-specific branching of their own.
export const useAuthSession =
  AUTH_PROVIDER === "local"
    ? useLocalAuthSession
    : () => neon.auth.useSession();

interface LocalAuthResult {
  token: string;
  user: { id: string; name: string | null; email: string };
}

const PENDING_INVITE_KEY = "pendingInviteToken";

// Set by app/routes/auth-join.tsx before it sends an unauthenticated visitor
// off to sign in/up, since that navigation loses the invite token in the URL
// otherwise. Consumed once, right after a successful sign-in/sign-up below.
export function savePendingInviteToken(token: string): void {
  localStorage.setItem(PENDING_INVITE_KEY, token);
}

async function acceptPendingInviteIfAny(): Promise<void> {
  const token = localStorage.getItem(PENDING_INVITE_KEY);
  if (!token) return;
  localStorage.removeItem(PENDING_INVITE_KEY);
  await localPost("/api/local-auth/invites/accept", { token }).catch(() => {});
}

async function signInLocal(
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
    await acceptPendingInviteIfAny();
    return {};
  } catch {
    return { error: "Couldn't reach the server. Please try again." };
  }
}

async function signUpLocal(
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
    // Accept a pending invite first if there is one, so signing up via an
    // invite link joins that org - bootstrap below is a no-op once the
    // account already has at least one org, so it won't also create a
    // redundant "Home" org on top of it.
    await acceptPendingInviteIfAny();
    await apiPost("/api/local-auth/bootstrap").catch(() => {});
    return {};
  } catch {
    return { error: "Couldn't reach the server. Please try again." };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string } | { error?: undefined }> {
  if (AUTH_PROVIDER === "local") return signInLocal(email, password);
  const { error } = await neon.auth.signIn.email({ email, password });
  if (error) return { error: error.message ?? "Sign in failed." };
  return {};
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<{ error: string } | { error?: undefined }> {
  if (AUTH_PROVIDER === "local") return signUpLocal(email, password, name);
  const { error } = await neon.auth.signUp.email({ email, password, name });
  if (error) return { error: error.message ?? "Sign up failed." };
  return {};
}

export async function forgotPassword(email: string): Promise<void> {
  if (AUTH_PROVIDER === "local") {
    await localPost("/api/local-auth/forgot-password", { email }).catch(
      () => {},
    );
    return;
  }
  await neon.auth
    .requestPasswordReset({ email, redirectTo: "/auth/reset-password" })
    .catch(() => {});
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ error: string } | { error?: undefined }> {
  if (AUTH_PROVIDER === "local") {
    try {
      const res = await localPost<{ success: boolean; message?: string }>(
        "/api/local-auth/reset-password",
        { token, newPassword },
      );
      if (!res.success) return { error: res.message ?? "Reset failed." };
      return {};
    } catch {
      return { error: "Couldn't reach the server. Please try again." };
    }
  }
  const { error } = await neon.auth.resetPassword({ newPassword, token });
  if (error) return { error: error.message ?? "Reset failed." };
  return {};
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
  const { data, error } = await neon.auth.organization.create({
    name: name.trim(),
    slug,
  });
  if (error)
    return { error: error.message ?? "Failed to create organization." };
  if (!data) return { error: "Failed to create organization." };
  return { id: data.id, name: data.name };
}
