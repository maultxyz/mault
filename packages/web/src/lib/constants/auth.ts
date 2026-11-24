import { runtimeEnv } from "@/lib/runtime-env";

export const AUTH_PROVIDER: "neon" | "local" =
  runtimeEnv("VITE_AUTH_PROVIDER") === "local" ? "local" : "neon";

const neonAuthProxyPath = runtimeEnv("VITE_NEON_AUTH_PROXY_PATH");

export const NEON_AUTH_BASE_URL = neonAuthProxyPath
  ? `${window.location.origin}${neonAuthProxyPath}`
  : (runtimeEnv("VITE_NEON_AUTH_URL") as string);

export const HARDWARE_BLOCKED_WHILE_IMPERSONATING_ERROR =
  "Scanning and sorter hardware are disabled while impersonating.";

export const SIGN_IN_PATH = "/auth/sign-in";
export const SIGN_UP_PATH = "/auth/sign-up";
export const AUTH_REDIRECT_PARAM = "redirectTo";
