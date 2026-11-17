import { runtimeEnv } from "@/lib/runtime-env";

export const AUTH_PROVIDER: "neon" | "local" =
  runtimeEnv("VITE_AUTH_PROVIDER") === "local" ? "local" : "neon";

export const NEON_SOCIAL_PROVIDERS = ["github", "google", "discord", "apple"] as const;

export const HARDWARE_BLOCKED_WHILE_IMPERSONATING_ERROR =
  "Scanning and sorter hardware are disabled while impersonating.";

export const SIGN_IN_PATH = "/auth/sign-in";
export const SIGN_UP_PATH = "/auth/sign-up";
export const AUTH_REDIRECT_PARAM = "redirectTo";
